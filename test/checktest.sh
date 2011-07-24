
EXPECTED=0
OVERRIDE_FILE=`echo $1 | sed -e 's/\.js/.ret/;'`
if [ -r "$OVERRIDE_FILE" ]; then
  EXPECTED=`cat $OVERRIDE_FILE`
fi

catchit() {
  GOT=$?
}
trap catchit 2
OUTPUT=`node $1`
RETVAL=$?
if [ "$GOT" = "" ]; then
  GOT=$RETVAL
fi
if [ "$GOT" = "$EXPECTED" ]; then
  echo "$1 SUCCESS: exited as expected"
  exit 0
fi
echo "========================================================"
echo "$OUTPUT"
echo "========================================================"
echo "$1 FAILED: exit($GOT), expected $EXPECTED"
exit 1
