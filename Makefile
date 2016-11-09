check:
	@for i in test/*.js; do \
		TEST_VERBOSE=1 NODE_PATH=`pwd`/lib test/checktest.sh `echo $$i | sed -e 's#test/##g;'` ; \
	done
