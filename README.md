# Distributed Voting System - Web Application

## Project Objective

Implementation of a **distributed voting system** that enables audiences to respond to questions concurrently over the internet. Votes are stored in a central database, and results are displayed in real-time on a display application.

---

## System Architecture

### Main Components

```
┌─────────────────────────────────────────────────────────────┐
│                    VOTING SYSTEM                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  CLIENTS               SERVER              DISPLAY APP       │
│  ├─ Web                ├─ HTTP server      │ Socket listener │
│                        ├─ RPC handling     │ Threading       │
│  └─ REST              ├─ DB sync           │ Lock/Mutex      │
│                        └─ UDP signals      └─ Graphical UI   │
│                                                              │
│                    DATABASE SERVER                          │
│                    ├─ MySQL / MongoDB     │                 │
│                    ├─ REST API (custom)   │                 │
│                    └─ Transaction handling│                 │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

| Component | Options |
|-----------|---------|
| **Web server** | Apache / Tomcat / Node.js |
| **Backend** | PHP / Python / Java |
| **Database** | MySQL / Text File + REST |
| **Client** | JavaScript / Android |
| **Display** | C / Python (Socket + Threading) |
| **Communication** | HTTP/RPC, UDP (for sync), TCP (sockets) |

---

## Task Breakdown (9-Member Team)

### **1. Server Application Setup**
- Web server configuration (Apache/Tomcat)
- HTML base page creation

### **2-3. Server Logic: Vote Reception and Database Management**
- Web RPC interface: receiving votes from clients
- Database writing (transactions)
- Display application notification of incoming votes
- Error handling and data consistency

### **4-5. Database Query**
- Reading votes from the database
- Real-time statistics collection
- Data sending to display
- Caching / performance optimization

### **6. Client Side: Web Form Design**
- Dynamic HTML form generation
- Display of questions and answer options
- UDP signal reception (vote start/end)
- User-friendly UI

### **7. Display Application (Socket Handling)**
- Listening socket creation
- Accept() operation - separate thread per client
- Thread pool management
- Lock/Mutex for display writing
- Graphical display 


### **9. Database Server (MySQL Implementation)**
- MySQL server installation
- Table structure design and creation
- Vote storage
- Database access provision (localhost/network)
- Backup and database integration

### **10. Database Server (Text File / REST API Implementation)**
- Socket listener program creation
- Vote storage in text files
- Custom REST API endpoints
- Concurrent write handling (locks)

### **11-12. Client Query & Statistics Display**
- Vote status query
- Results display on webpage
- Real-time charts/graphs (Chart.js, D3.js, etc.)
- Refresh mechanisms (polling / WebSocket)

### **13. User Interface (UI/UX Design)**
- Central dashboard
- Voting page (question + options)
- Results display page
- Responsive design
- Modern CSS framework (Bootstrap / Tailwind)

### **14. Login & Registration**
- User authentication
- Session management
- Password encryption 
- Login form
- Registration form

## Installation and Running

### Prerequisites
```
- Python 3.8+ or Java 11+
- MySQL 5.7+ or Node.js 
- Git
```
