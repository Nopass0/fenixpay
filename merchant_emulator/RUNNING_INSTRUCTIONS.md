# Merchant Emulator - Running Instructions

## Problem
The merchant emulator encounters "Permission denied (os error 13)" due to:
1. The system Downloads directory (`~/Загрузки`) being owned by root with no user permissions
2. The `dirs` crate trying to access system directories that require elevated permissions

## Solutions

### Solution 1: Fixed Configuration (Already Applied)
The configuration has been modified to use home directory locations instead of system directories:
- Data directory: `~/.merchant-emulator/data`
- Export directory: `~/.merchant-emulator/exports`

### Solution 2: Running the Application

#### Option A: Run in a Terminal
The merchant emulator requires an interactive terminal. Run it directly in your terminal:

```bash
cd /home/user/projects/chase/merchant_emulator
cargo run --release
```

Or use the built binary:
```bash
./target/release/merchant-emulator
```

#### Option B: Use Environment Variables
You can override the default directories using environment variables:

```bash
export MERCHANT_DATA_DIR="/path/to/your/data"
export MERCHANT_EXPORT_DIR="/path/to/your/exports"
cargo run --release
```

### Solution 3: Fix System Directory Permissions (If You Have sudo)
If you want to use the original Downloads directory, fix the permissions:

```bash
sudo chown -R $USER:$USER ~/Загрузки
```

### Solution 4: Install cargo for sudo (Not Recommended)
If you absolutely need to run with sudo, you would need to install Rust for the root user:

```bash
sudo su -
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

However, this is not recommended as it's better to fix the permission issues.

## Current Status
- The application builds successfully
- The callback server starts on port 8080
- The configuration uses writable directories in the user's home
- The application needs to be run in an interactive terminal

## Running the Application
1. Open a terminal
2. Navigate to: `/home/user/projects/chase/merchant_emulator`
3. Run: `cargo run --release` or `./target/release/merchant-emulator`
4. The interactive menu will appear

## Troubleshooting
- If you see "not a terminal" error, make sure you're running in an actual terminal, not through a script or non-interactive shell
- If port 8080 is in use, modify the `callback_server_port` in the config
- Check that directories exist: `ls -la ~/.merchant-emulator/`