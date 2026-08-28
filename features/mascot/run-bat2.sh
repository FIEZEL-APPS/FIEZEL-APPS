# [FASE 7] Pelari baterai tes paralel untuk QA slot layer (sementara).
cd /home/user/workspace/fiezel-repo
: > /tmp/battery-failed.txt
run_one() {
  timeout 240 node "$1" >"/tmp/bat-$1.log" 2>&1 || echo "$1 code=$?" >> /tmp/battery-failed.txt
}
export -f run_one
xargs -a /tmp/battery.txt -P 6 -I{} bash -c 'run_one "$1"' _ {}
echo done > /tmp/battery-done.txt
