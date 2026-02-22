document.addEventListener('DOMContentLoaded', () => {
    const codeForm = document.getElementById('codeForm');
    const terminalContent = document.getElementById('terminalContent');
    const submitBtn = document.getElementById('submitBtn');
    const copyBtn = document.getElementById('copyBtn');
    const clearBtn = document.getElementById('clearBtn');
    const historyCountSpan = document.getElementById('historyCount');

    // API Configuration
    // Replace with your actual backend endpoint
    const HISTORY_API_URL = 'https://hybrisaismeapi.example.com/api/queryCounts'; 
    const PROCESS_API_URL = 'https://hybrisaismeapi.example.com/api/queryCountCheck';

    /**
     * Helper to add log messages to the terminal
     */
    function addLog(message, type = 'system') {
        const now = new Date();
        const timeString = `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`;
        
        const logDiv = document.createElement('div');
        logDiv.classList.add('log-entry', type);
        
        logDiv.innerHTML = `
            <span class="timestamp">[${timeString}]</span>
            <p>${message}</p>
        `;
        
        terminalContent.appendChild(logDiv);
        terminalContent.scrollTop = terminalContent.scrollHeight;
    }

    /**
     * 1. FETCH HISTORY ON PAGE LOAD
     * This simulates fetching previous submissions from the database
     */
    async function fetchHistory() {
        try {
            // Simulate Network Request
            // In production, uncomment the fetch block below
            
            // --- MOCK API LOGIC (Remove for Real API) ---
            /*
            console.log("Simulating API call to fetch history...");
            await new Promise(resolve => setTimeout(resolve, 800)); // Fake delay
            
            const mockHistoryData = [
                { date: "10:30:05", title: "Impex Migration Script", status: "success", output: "Imported 500 Products successfully." },
                { date: "09:15:22", title: "Checkout Decorator Bug", status: "error", output: "NullPointerException at line 44 in CheckoutController." },
                { date: "Yesterday", title: "Price Calculation Update", status: "success", output: "Configuration updated for EUR currency." }
            ];

            renderHistoryToTerminal(mockHistoryData);
            */
            // --- REAL API LOGIC (Uncomment and use) ---
            const response = await fetch(HISTORY_API_URL, {
                method: 'GET',
                headers: {}
            });
            if (!response.ok) throw new Error("Failed to load history");
            const data = await response.json();
            renderHistoryToTerminal(data);

        } catch (error) {
            console.error("Error loading history:", error);
            addLog("Error: Could not retrieve recent history.", "error");
            historyCountSpan.innerText = "Error";
        } finally {
            historyCountSpan.innerText = "Recent Activity";
        }
    }

    /**
     * Helper to inject historical data into the DOM
     */
    function renderHistoryToTerminal(historyArray) {
        if (!historyArray || historyArray.length === 0) {
            addLog("No previous execution history found.", "system");
            return;
        }

        historyArray.forEach(item => {
            // Add a separator for historical items
            const separator = document.createElement('hr');
            separator.style.borderColor = '#3e3e42';
            separator.style.margin = "15px 0";
            terminalContent.appendChild(separator);

            addLog(`Previous Session: ${item.title} (${item.date})`, 'title');
            addLog(item.codeSnippet.replace(/\n/g, "<br>").replace(/\t/g, "&nbsp;&nbsp;&nbsp;&nbsp;"), 'system');
            if (item.status === 'notSuccess') {
                addLog(item.codeSnippet, 'error');
            } else {
                addLog(item.aiReply, 'success');
            }
        });

        // Scroll to bottom to show the oldest history first if stacked top-down, 
        // or top to show newest first. Here we assume stack-down (newest at bottom).
        terminalContent.scrollTop = terminalContent.scrollHeight;
    }

    /**
     * 2. SUBMIT NEW CODE
     */
    codeForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('codeTitle').value.trim();
        const code = document.getElementById('codeSnippet').value.trim();
        const type = document.getElementById('requestType').value;

        if (!title || !code) {
            alert("Please provide both a task title and code snippet.");
            return;
        }

        // UI Loading State
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<div class="spinner"></div> Processing...';
        addLog(`Starting process: "${title}"...`, 'title');

        try {
            // --- REAL API CALL (Uncomment for production) ---
            const response = await fetch(PROCESS_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ codeSnippet: code, title: title })
            });
            if (!response.ok) throw new Error('Processing failed');
            let result = await response.json();
            
            if (code.includes("error") || code.includes("null")) {
                result = { status: 'error', output: 'Runtime Exception: Null Pointer in Service Layer.' };
            } else {
                result = { status: 'success', output: `Task "${title}" completed successfully. Processed ${code.length} chars.` };
            }
            // -------------------------------------

            // Add the new result to the terminal
            addLog(`Process "${title}" finished: ${result.status.toUpperCase()}`, result.status === 'success' ? 'success' : 'error');
            addLog(result.output, result.status === 'success' ? 'success' : 'error');

            // Reset Form
            document.getElementById('codeSnippet').value = '';
            document.getElementById('codeTitle').value = '';

        } catch (error) {
            addLog(`Error: ${error.message}`, 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fa-solid fa-play"></i> Run Analysis';
        }
    });

    /**
     * 3. COPY & CLEAR FUNCTIONS
     */
    copyBtn.addEventListener('click', () => {
        const textToCopy = terminalContent.innerText;
        navigator.clipboard.writeText(textToCopy).then(() => {
            const originalText = copyBtn.innerHTML;
            copyBtn.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
            setTimeout(() => copyBtn.innerHTML = originalText, 3000);
        }).catch(err => console.error('Copy failed', err));
    });

    clearBtn.addEventListener('click', () => {
        if(confirm("Are you sure you want to clear the log window?")) {
            terminalContent.innerHTML = '';
            addLog("Terminal cleared by user.", 'system');
        }
    });

    // --- INITIALIZE ---
    fetchHistory();
});

