import assert from "node:assert/strict";
import {byteRange} from "./byte-range";
assert.deepEqual(byteRange("bytes=0-1",10),{start:0,end:1});assert.deepEqual(byteRange("bytes=2-",10),{start:2,end:9});assert.deepEqual(byteRange("bytes=-3",10),{start:7,end:9});assert.deepEqual(byteRange("bytes=0-100",10),{start:0,end:9});
for(const bad of ["bytes=-0","bytes=11-","bytes=4-2","bytes=0-1,4-5","bytes=9999999999999999999-","random"] ) assert.equal(byteRange(bad,10),"invalid");
console.log("PASS authenticated media range parsing, suffixes and invalid ranges");
