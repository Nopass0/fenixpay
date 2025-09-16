use crate::models::CallbackRequest;
use axum::{
    extract::State,
    http::StatusCode,
    response::Json,
    routing::post,
    Router,
};
use std::sync::Arc;
use tokio::sync::mpsc;
use tower_http::cors::CorsLayer;
use tracing::{error, info};

#[derive(Clone)]
pub struct CallbackState {
    pub sender: mpsc::UnboundedSender<CallbackRequest>,
}

pub struct CallbackServer {
    port: u16,
    receiver: mpsc::UnboundedReceiver<CallbackRequest>,
    sender: mpsc::UnboundedSender<CallbackRequest>,
}

impl CallbackServer {
    pub fn new(port: u16) -> Self {
        let (sender, receiver) = mpsc::unbounded_channel();
        Self {
            port,
            receiver,
            sender,
        }
    }
    
    pub fn get_sender(&self) -> mpsc::UnboundedSender<CallbackRequest> {
        self.sender.clone()
    }
    
    pub async fn try_recv(&mut self) -> Option<CallbackRequest> {
        self.receiver.try_recv().ok()
    }
    
    pub async fn start(self) -> Result<(), Box<dyn std::error::Error>> {
        let state = CallbackState {
            sender: self.sender.clone(),
        };
        
        let app = Router::new()
            .route("/callback", post(handle_callback))
            .layer(CorsLayer::permissive())
            .with_state(Arc::new(state));
            
        let addr = format!("0.0.0.0:{}", self.port);
        let listener = tokio::net::TcpListener::bind(&addr).await?;
        
        info!("Callback server listening on {}", addr);
        
        axum::serve(listener, app).await?;
        
        Ok(())
    }
}

async fn handle_callback(
    State(state): State<Arc<CallbackState>>,
    Json(payload): Json<CallbackRequest>,
) -> StatusCode {
    info!("Received callback: {:?}", payload);
    
    if let Err(e) = state.sender.send(payload) {
        error!("Failed to send callback to channel: {}", e);
        return StatusCode::INTERNAL_SERVER_ERROR;
    }
    
    StatusCode::OK
}