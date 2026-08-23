use std::env;
use redis::AsyncCommands;
use redis::aio::MultiplexedConnection;

pub struct RedisCache;
impl RedisCache {
  async fn connect(&self) -> redis::RedisResult<MultiplexedConnection> {
    let host = env::var("REDIS_HOST")
      .expect("REDIS_HOST must be set on .env file");
    let port = env::var("REDIS_PORT")
      .expect("REDIS_PORT must be set on .env file");

    let client = redis::Client::open(format!("redis://{}:{}", host, port))?;
    client.get_multiplexed_async_connection().await
  }

  #[allow(dead_code)]
  pub async fn get(&self, key: &str) -> Option<String> {
    let mut conn = self.connect().await.ok()?;
    conn.get::<_, Option<String>>(key).await.ok().flatten()
  }

  #[allow(dead_code)]
  pub async fn set(&self, key: &str, value: &str) -> redis::RedisResult<()> {
    let mut conn = self.connect().await?;
    conn.set::<_, _, ()>(key, value).await
  }
}
