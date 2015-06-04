all: clean ts

clean:
	rm -rf lib/*

ts:
	tsc --rootDir src/ --outDir lib --module commonjs
