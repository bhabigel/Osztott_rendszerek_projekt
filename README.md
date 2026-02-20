# Distributed Voting System - Web Application

## Project Objective

Implementation of a **distributed voting system** that enables audiences to respond to questions concurrently over the internet. Votes are stored in a central database, and results are displayed in real-time on a display application.

---

## Start Guide

### Prerequisites (All Platforms)

- **Node.js** 18+ ([download](https://nodejs.org))
- **Git** ([download](https://git-scm.com))

### macOS Setup

```bash
# 1. Clone and install dependencies
git clone https://github.com/bhabigel/Osztott_rendszerek_projekt.git
cd Osztott_rendszerek_projekt
npm install

# 2. Run setup script (installs nginx via Homebrew)
npm run setup:mac

# 3. Start everything
npm run start:all:mac

# 4. Open in browser
open http://localhost:8081
```

### Windows Setup

```powershell
# 1. Install nginx manually
# Download from: https://nginx.org/en/download.html
# Extract to C:\nginx

# 2. Clone and install dependencies
git clone https://github.com/bhabigel/Osztott_rendszerek_projekt.git
cd Osztott_rendszerek_projekt
npm install

# 3. Run setup script (PowerShell as Administrator)
npm run setup:win

# 4. Start everything
npm run start:all:win

# 5. Open in browser
start http://localhost:8081
```

### NPM Scripts Reference

| Command | Description |
|---------|-------------|
| `npm run start:pm2` | Start all PM2 server instances |
| `npm run stop:pm2` | Stop all PM2 instances |
| `npm run restart:pm2` | Restart all PM2 instances |
| `npm run logs` | View PM2 logs |
| `npm run status` | Check PM2 instance status |
| `npm run start:nginx:mac` | Start nginx (macOS) |
| `npm run start:nginx:win` | Start nginx (Windows) |
| `npm run stop:nginx:mac` | Stop nginx (macOS) |
| `npm run stop:nginx:win` | Stop nginx (Windows) |
| `npm run start:all:mac` | Start PM2 + nginx (macOS) |
| `npm run start:all:win` | Start PM2 + nginx (Windows) |
| `npm run stop:all:mac` | Stop everything (macOS) |
| `npm run stop:all:win` | Stop everything (Windows) |
| `npm run health` | Test load balancer health |

### Testing Load Balancing

```bash
# Test that requests are distributed across instances
curl http://localhost:8081/health
curl http://localhost:8081/api/bet

# The response includes _debug.port showing which instance handled the request
```

### Architecture Overview

```
┌─────────┐     ┌───────────────┐     ┌─────────────────┐
│ Browser │────▶│ nginx (:8081) │────▶│ PM2 Instance A  │──┐
└─────────┘     │ Load Balancer │────▶│ PM2 Instance B  │──┼──▶ [Database]
                │   (ip_hash)   │────▶│ PM2 Instance C  │──┘
                └───────────────┘     └─────────────────┘
                                      (ports 3001-3003)
```

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
