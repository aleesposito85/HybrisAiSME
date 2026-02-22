package main

import (
    "bytes"
    "database/sql"
    "encoding/json"
    "fmt"
    "log"
    "net/http"
    "os"
    "time"

    "github.com/gorilla/mux"
    "github.com/joho/godotenv"
    _ "github.com/microsoft/go-mssqldb"
)

type CodeRequest struct {
    ID          int    `json:"id"`
    Title       string `json:"title"`
    CodeSnippet string `json:"codeSnippet"`
    Date        string `json:"date"`
    AIReply     string `json:"aiReply"`
}

type WebhookPayload struct {
    ID          int    `json:"id"`
    Title       string `json:"title"`
    CodeSnippet string `json:"codeSnippet"`
}

var db *sql.DB
var webhookURL string

func initDB() {
    err := godotenv.Load("/root/.env")
    if err != nil {
        log.Fatal("Error loading .env file")
    }

    connectionString := os.Getenv("DATABASE_URL")
    if connectionString == "" {
        log.Fatal("DATABASE_URL not set in environment")
    }

    webhookURL = os.Getenv("WEBHOOK_URL_HYBRIS_QUERY_COUNT") // Optional webhook URL

    db, err = sql.Open("sqlserver", connectionString)
    if err != nil {
        log.Fatal("Error creating connection pool: ", err.Error())
    }

    // Create table if it doesn't exist
    createTableSQL := `
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='hybrisQueryCount' AND xtype='U')
    CREATE TABLE hybrisQueryCount (
        id INT IDENTITY(1,1) PRIMARY KEY,
        title NVARCHAR(255),
        codeSnippet NVARCHAR(MAX),
        aiReply NVARCHAR(MAX),
        date DATETIME2
    );`
    _, err = db.Exec(createTableSQL)
    if err != nil {
        log.Fatal("Error creating table: ", err.Error())
    }

    fmt.Println("Database connected successfully!")
}

func getQueryCounts(w http.ResponseWriter, r *http.Request) {
    rows, err := db.Query("SELECT TOP 5 * FROM hybrisQueryCount ORDER BY date DESC")
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }
    defer rows.Close()

    var requests []CodeRequest
    for rows.Next() {
        var cr CodeRequest
        var date time.Time
        err := rows.Scan(&cr.ID, &cr.Title, &cr.CodeSnippet, &cr.AIReply, &date)
        if err != nil {
            http.Error(w, err.Error(), http.StatusInternalServerError)
            return
        }
        cr.Date = date.Format(time.RFC3339)
        requests = append(requests, cr)
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(requests)
}

func callWebhook(id int, title string, codeSnippet string) {
    if webhookURL == "" {
        log.Println("WEBHOOK_URL not configured, skipping webhook call")
        return
    }

    // Prepare webhook payload
    payload := WebhookPayload{
        ID:         id,
        Title:      title,
	    CodeSnippet:codeSnippet,
    }

    payloadBytes, err := json.Marshal(payload)
    if err != nil {
        log.Printf("Error marshaling webhook payload: %v", err)
        return
    }

    // Call the webhook
    resp, err := http.Post(webhookURL, "application/json", bytes.NewBuffer(payloadBytes))
    if err != nil {
        log.Printf("Error calling webhook: %v", err)
        return
    }
    defer resp.Body.Close()

    log.Printf("Webhook called successfully for suggestion ID: %d", id)
}

func queryCountCheck(w http.ResponseWriter, r *http.Request) {
    var cr CodeRequest
    err := json.NewDecoder(r.Body).Decode(&cr)
    if err != nil {
        http.Error(w, err.Error(), http.StatusBadRequest)
        return
    }
    
    
    // Use SQL Server's GETDATE() function instead of passing date from client
    query := `INSERT INTO hybrisQueryCount (title, codeSnippet, aiReply, date) OUTPUT INSERTED.id VALUES (@p1, @p2, '', GETDATE())`
    
    var insertedID int
    //, cr.CodeSnippet, ""
    err = db.QueryRow(query, cr.Title, cr.CodeSnippet).Scan(&insertedID)
    if err != nil {
        http.Error(w, "Database error: "+err.Error(), http.StatusInternalServerError)
        return
    }

    // Fetch the complete inserted record
    row := db.QueryRow("SELECT id, title, codeSnippet, date FROM hybrisQueryCount WHERE id = @p1", insertedID)
    var date time.Time
    err = row.Scan(&cr.ID, &cr.Title, &cr.CodeSnippet, &date)
    if err != nil {
        http.Error(w, "Error fetching inserted record: "+err.Error(), http.StatusInternalServerError)
        return
    }
    
    cr.ID = insertedID
    cr.Date = date.Format(time.RFC3339)

    // Call webhook with the new suggestion
    go callWebhook(cr.ID, cr.Title, cr.CodeSnippet)

    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusCreated)
    json.NewEncoder(w).Encode(cr)
}

func enableCORS(next http.HandlerFunc) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        w.Header().Set("Access-Control-Allow-Origin", "*")
        w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
        
        if r.Method == "OPTIONS" {
            w.WriteHeader(http.StatusOK)
            return
        }
        
        next(w, r)
    }
}

func main() {
    initDB()
    defer db.Close()

    r := mux.NewRouter()
    
    r.HandleFunc("/api/queryCounts", enableCORS(getQueryCounts)).Methods("GET", "OPTIONS")
    r.HandleFunc("/api/queryCountCheck", enableCORS(queryCountCheck)).Methods("POST", "OPTIONS")
    
    // Serve static files
    r.PathPrefix("/").Handler(http.FileServer(http.Dir("./")))

    fmt.Println("Server starting on :8081")
    log.Fatal(http.ListenAndServe(":8081", r))
}
