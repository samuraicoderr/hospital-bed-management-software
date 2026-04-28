diff-staged:
	git diff --cached > ./a.diff
	code ./a.diff
	rm ./a.diff

diff+: diff-staged


diff-unstaged:
	git diff > ./a.diff
	code ./a.diff
	rm ./a.diff

diff: diff-unstaged


wiff:
	dit diff > ./a.diff
	windsurf ./a.diff
	rm ./a.diff


wiff+:
	git diff --cached > ./a.diff
	windsurf ./a.diff
	rm ./a.diff