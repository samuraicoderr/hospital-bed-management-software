.DEFAULT_GOAL := run

install:
	npm install


build:
	npm run build


run:
	npm run dev


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
