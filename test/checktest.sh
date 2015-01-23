#!/bin/bash
cd `dirname $0`

ERRORS=0
catchit() {
	GOT=$?
}
trap catchit 2
runtest() {
	local EXPECTED=0
	local OVERRIDE_FILE=`echo $1 | sed -e 's/\.js/.ret/;'`
	if [ -r "$OVERRIDE_FILE" ]; then
		EXPECTED=`cat $OVERRIDE_FILE`
	fi
	local OUTPUT
  local RETVAL
  GOT=""
	OUTPUT=$(node $1)
	RETVAL=$?
	if [ "$GOT" = "" ]; then
		GOT=$RETVAL
	fi
	if [ "$GOT" = "$EXPECTED" ]; then
		echo "$1 SUCCESS: exited as expected"
	else
		echo "========================================================"
		echo "$OUTPUT"
		echo "========================================================"
		echo "$1 FAILED: exit($GOT), expected $EXPECTED"
		ERRORS=1
	fi
}

if [ -z "$*" ]; then
	tests=`ls *.js`
else
	tests=$*
fi
for test in $tests; do
  runtest $test
done

exit $ERRORS
