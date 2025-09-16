use anyhow::Result;
use crossterm::{
    event::{self, Event, KeyCode},
    execute,
    terminal::{self, EnterAlternateScreen, LeaveAlternateScreen},
};
use std::io::{self, Write};
use tokio::sync::mpsc;
use tokio::time::{timeout, Duration};

pub struct LogViewer;

impl LogViewer {
    pub async fn view_logs(log_receiver: mpsc::Receiver<String>) -> Result<()> {
        // Enter alternate screen for log viewing
        execute!(io::stdout(), EnterAlternateScreen)?;
        terminal::enable_raw_mode()?;
        
        let result = Self::log_viewer_loop(log_receiver).await;
        
        // Cleanup
        terminal::disable_raw_mode()?;
        execute!(io::stdout(), LeaveAlternateScreen)?;
        
        result
    }
    
    async fn log_viewer_loop(mut log_receiver: mpsc::Receiver<String>) -> Result<()> {
        println!("\r\n=== Traffic Log Viewer ===");
        println!("\rPress 'q' or ESC to exit log viewer and return to menu\r\n");
        
        loop {
            // Check for new logs (non-blocking)
            match timeout(Duration::from_millis(100), log_receiver.recv()).await {
                Ok(Some(log_line)) => {
                    print!("\r{}\r\n", log_line);
                    io::stdout().flush()?;
                }
                Ok(None) => {
                    // Channel closed, exit
                    break;
                }
                Err(_) => {
                    // Timeout, no new logs - check for user input
                }
            }
            
            // Check for user input (non-blocking)
            if event::poll(Duration::from_millis(10))? {
                if let Event::Key(key_event) = event::read()? {
                    match key_event.code {
                        KeyCode::Char('q') | KeyCode::Esc => {
                            println!("\r\nExiting log viewer...\r");
                            break;
                        }
                        _ => {}
                    }
                }
            }
        }
        
        Ok(())
    }
    
    pub fn create_log_channel() -> (mpsc::Sender<String>, mpsc::Receiver<String>) {
        mpsc::channel(1000)
    }
}