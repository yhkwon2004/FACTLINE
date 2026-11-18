export function byteRange(header:string|null,length:number):{start:number;end:number}|null|"invalid" {
 if(!header)return null;
 const match=/^bytes=(\d*)-(\d*)$/.exec(header);if(!match||(!match[1]&&!match[2])||length<1)return "invalid";
 let start:number,end:number;
 if(!match[1]){const suffix=Number(match[2]);if(!Number.isSafeInteger(suffix)||suffix<1)return "invalid";start=Math.max(0,length-suffix);end=length-1;}
 else{start=Number(match[1]);end=match[2]?Math.min(Number(match[2]),length-1):length-1;}
 return Number.isSafeInteger(start)&&Number.isSafeInteger(end)&&start>=0&&start<length&&end>=start?{start,end}:"invalid";
}
