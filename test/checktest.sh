
EXPECTED=0
OVERRIDE_FILE=`echo $1 | sed -e 's/\.js/.ret/;'`
if [ -r "$OVERRIDE_FILE" ]; then
  EXPECTED=`cat $OVERRIDE_FILE`
fi

node $1 > /dev/null 2>&1
GOT=$?
if [ "$GOT" = "$EXPECTED" ]; then
  echo "$1 SUCCESS: exited as expected"
  exit 0
fi
echo "$1 FAILED: exit($GOT), expected $EXPECTED"
exit 1
