systemfd --no-pid -s http::8080 -- \
  cargo watch -i ".cargo/*" -i "target/*" -i ".git/*" -i "static/*" -i "logs/*" -x run