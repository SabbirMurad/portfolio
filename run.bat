# Dev loop. Two watchers, because two things are built now.
#
#   1. the assets: .jsx -> assets/build/<page>.js, and the Tailwind input ->
#      assets/build/tailwind.css. Without this, editing a component or adding
#      a class serves a stale bundle.
#   2. the server. Tera loads the templates once at startup, so a change under
#      pages/ only shows up after a restart — cargo watch handles that.
#
# assets/build is ignored below: the asset watcher writes there, and a restart
# of the server on its own output would loop.
node tools/build_assets.mjs --watch &
ASSETS=$!
trap 'kill $ASSETS 2>/dev/null' EXIT

systemfd --no-pid -s http::8080 -- \
  cargo watch -i ".cargo/*" -i "target/*" -i ".git/*" -i "static/*" -i "logs/*" \
              -i "assets/build/*" -x run
