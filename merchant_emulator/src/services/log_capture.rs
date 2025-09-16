use tokio::sync::mpsc;
use tracing::{Level, Subscriber};
use tracing_subscriber::{Layer, layer::Context};
use std::sync::Arc;
use parking_lot::RwLock;

/// A tracing layer that captures logs and sends them through a channel
pub struct LogCaptureLayer {
    tx: Arc<RwLock<Option<mpsc::Sender<String>>>>,
}

impl LogCaptureLayer {
    pub fn new() -> (Self, LogCaptureHandle) {
        let tx = Arc::new(RwLock::new(None));
        let layer = Self { tx: tx.clone() };
        let handle = LogCaptureHandle { tx };
        (layer, handle)
    }
}

impl<S> Layer<S> for LogCaptureLayer 
where
    S: Subscriber,
{
    fn on_event(&self, event: &tracing::Event<'_>, _ctx: Context<'_, S>) {
        // Only capture INFO, ERROR, and WARN level logs
        let level = event.metadata().level();
        if !matches!(level, &Level::INFO | &Level::ERROR | &Level::WARN) {
            return;
        }

        // Format the log message
        let mut visitor = LogVisitor::default();
        event.record(&mut visitor);
        
        let timestamp = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%S%.3fZ");
        let log_line = format!("{} {} {}: {}", 
            timestamp,
            level,
            event.metadata().target(),
            visitor.message
        );
        
        // Send to channel if available
        if let Some(tx) = self.tx.read().as_ref() {
            let _ = tx.try_send(log_line);
        }
    }
}

/// Handle to control log capture
pub struct LogCaptureHandle {
    tx: Arc<RwLock<Option<mpsc::Sender<String>>>>,
}

impl LogCaptureHandle {
    pub fn set_channel(&self, tx: mpsc::Sender<String>) {
        *self.tx.write() = Some(tx);
    }
    
    pub fn clear_channel(&self) {
        *self.tx.write() = None;
    }
}

#[derive(Default)]
struct LogVisitor {
    message: String,
}

impl tracing::field::Visit for LogVisitor {
    fn record_str(&mut self, field: &tracing::field::Field, value: &str) {
        if field.name() == "message" {
            self.message = value.to_string();
        }
    }
    
    fn record_debug(&mut self, field: &tracing::field::Field, value: &dyn std::fmt::Debug) {
        if field.name() == "message" {
            self.message = format!("{:?}", value);
        }
    }
}