#!/usr/bin/env sh
set -eu
cargo build -p near-purple-exchange -p purple-mock-token --target wasm32-unknown-unknown --release --locked
mkdir -p artifacts
for name in near_purple_exchange purple_mock_token; do
  node_modules/binaryen/bin/wasm-opt "target/wasm32-unknown-unknown/release/$name.wasm" -o "artifacts/$name.wasm" -Oz --signext-lowering --llvm-memory-copy-fill-lowering --llvm-nontrapping-fptoint-lowering --strip-debug
done
