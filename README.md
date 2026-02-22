**Hybris AI SME web application**

website built in simple html, js, css, (deployed with caddy server on a proxmox container)
the backend API build in golang (deployed on a proxmox container)
database is sql server (deployed with docker)
N8N is used to trigger the AI model (deployed on a proxmox container)
AI model running with ollama (deployed with docker)

**Functionalities**
- Counts the number of queries triggered to the db for the input code snippet using AI

**Coming soon:**
- Benchmark: runs benchmark on the code snippet returning running time + AI suggestions to improve it
- Comments: generate AI comments for the code snippet

<img width="1297" height="812" alt="Screenshot 2026-02-22 at 11 21 33 PM" src="https://github.com/user-attachments/assets/25c09121-e4e2-4688-9070-f53457a1f504" />

<img width="1334" height="435" alt="Screenshot 2026-02-22 at 11 05 24 PM" src="https://github.com/user-attachments/assets/60e2207d-2ae5-4124-8197-85ff176a109b" />
