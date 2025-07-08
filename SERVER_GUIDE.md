# 🚀 Financial Schedule Optimizer - Server Management Guide

Quick guide for starting, stopping, and managing the Financial Schedule Optimizer server.

## 🎯 Quick Start (30 seconds)

```bash
# 1. Start development server
npm run server:start

# 2. Open browser to http://localhost:3000

# 3. When done, stop server
npm run server:stop
```

## 📋 All Commands

### Essential Commands
| Command | What it does | When to use |
|---------|--------------|-------------|
| `npm run server:start` | Start development server | Daily development |
| `npm run server:start:prod` | Start production server | Testing production build |
| `npm run server:stop` | Stop any running server | When finished working |
| `npm run server:status` | Check if server is running | Troubleshooting |

### Monitoring & Logs
| Command | What it does | When to use |
|---------|--------------|-------------|
| `npm run server:logs` | Show recent server logs | Debugging errors |
| `npm run server:logs 100` | Show last 100 log lines | Deep debugging |

### Maintenance
| Command | What it does | When to use |
|---------|--------------|-------------|
| `npm run server:restart` | Restart development server | After code changes |
| `npm run server:clean` | Clean up build files | Disk space or fresh start |

## 🌍 Cross-Platform Support

### Windows Users
```cmd
npm run server:start
npm run server:status
npm run server:stop
```

### Mac/Linux Users (Two Options)

**Option 1: NPM Scripts (Recommended)**
```bash
npm run server:start
npm run server:status  
npm run server:stop
```

**Option 2: Direct Bash Script**
```bash
./scripts/server.sh start
./scripts/server.sh status
./scripts/server.sh stop
```

## 🛠 Common Workflows

### Daily Development
```bash
# Morning: Start development
npm run server:start
# Browser opens to http://localhost:3000

# During day: Check status if needed
npm run server:status

# Evening: Stop server
npm run server:stop
```

### Testing Production Build
```bash
# Build and serve production version
npm run server:start:prod
# Browser opens to http://localhost:5000

# Test the production app
# When done:
npm run server:stop
```

### Troubleshooting Issues
```bash
# Check if server is running
npm run server:status

# View recent errors
npm run server:logs

# Restart if having issues
npm run server:restart

# Clean up if really stuck
npm run server:clean
npm run server:start
```

## 🚨 Troubleshooting

### "Port 3000 is already in use"
```bash
npm run server:stop
npm run server:start
```

### "Server won't start"
```bash
npm run server:clean
npm install
npm run server:start
```

### "Can't access http://localhost:3000"
```bash
npm run server:status
# If not running, start it:
npm run server:start
```

### "Server won't stop"
```bash
# Force stop (Mac/Linux)
killall node

# Or find and kill process
ps aux | grep node
kill [process_id]
```

## 📊 Server Information

| Mode | Port | Purpose | Command |
|------|------|---------|---------|
| Development | 3000 | Daily coding with hot reload | `npm run server:start` |
| Production | 5000 | Testing optimized build | `npm run server:start:prod` |

## 🔧 Advanced Features (Bash Script Only)

```bash
# Follow logs in real-time
./scripts/server.sh logs-follow

# Comprehensive health check
./scripts/server.sh health

# Run tests automatically
./scripts/server.sh test e2e
```

## 📁 Generated Files

When you run the server, these files are created:
```
scripts/
├── server.pid    # Process ID (auto-deleted when stopped)
├── server.log    # Server output logs
└── ...
```

**Note:** These files are automatically managed - you don't need to touch them.

## ⚡ Pro Tips

1. **Keep it simple:** Use `npm run server:start` for 99% of development
2. **Check status first:** Run `npm run server:status` if something seems wrong
3. **View logs for errors:** `npm run server:logs` shows what went wrong
4. **Clean start:** `npm run server:clean` fixes most weird issues
5. **Production testing:** Use `npm run server:start:prod` before deploying

## 🆘 Need Help?

1. **Check server status:** `npm run server:status`
2. **View error logs:** `npm run server:logs`
3. **Try clean restart:** `npm run server:clean && npm run server:start`
4. **Check the full documentation:** `scripts/README.md`

---

**Most used commands:**
- `npm run server:start` - Start development
- `npm run server:stop` - Stop server
- `npm run server:status` - Check status
- `npm run server:logs` - View errors