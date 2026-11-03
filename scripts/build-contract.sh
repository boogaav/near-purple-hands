#!/usr/bin/env sh
set -eu
cargo build -p near-purple-exchange -p purple-mock-token --target wasm32-unknown-unknown --release --locked --features near-purple-exchange/test-oracle
mkdir -p artifacts
for name in near_purple_exchange purple_mock_token; do
  node_modules/binaryen/bin/wasm-opt "target/wasm32-unknown-unknown/release/$name.wasm" -o "artifacts/$name.wasm" -Oz --signext-lowering --llvm-memory-copy-fill-lowering --llvm-nontrapping-fptoint-lowering --strip-debug
done

# Separate verified-only artifact: no test initializer or manual price export.
cargo build -p near-purple-exchange --target wasm32-unknown-unknown --release --locked
node_modules/binaryen/bin/wasm-opt target/wasm32-unknown-unknown/release/near_purple_exchange.wasm -o artifacts/near_purple_exchange_verified.wasm -Oz --signext-lowering --llvm-memory-copy-fill-lowering --llvm-nontrapping-fptoint-lowering --strip-debug
