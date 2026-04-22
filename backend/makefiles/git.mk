diff:
	git add -N .
	git diff > a.diff
	code a.diff

rmdiff:
	rm a.diff