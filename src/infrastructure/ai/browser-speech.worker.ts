import {pipeline,env,type AutomaticSpeechRecognitionPipeline} from '@huggingface/transformers';
env.allowLocalModels=false;env.backends.onnx.wasm!.wasmPaths='/onnx/';
const load=pipeline as (task:'automatic-speech-recognition',id:string,options:Record<string,unknown>)=>Promise<AutomaticSpeechRecognitionPipeline>;
let model:Promise<AutomaticSpeechRecognitionPipeline>|undefined;
self.onmessage=async(e:MessageEvent<{audio:Float32Array;model?:'tiny'|'small'}>)=>{try{
 const precise=e.data.model==='small';
 model??=load('automatic-speech-recognition',precise?'onnx-community/whisper-small':'onnx-community/whisper-tiny',{revision:precise?'36050c46d777d46dc4b5f43f6d90574fc38f8732':'ff4177021cc41f7db950912b73ea4fdf7d01d8e7',dtype:'q8',device:'wasm',progress_callback:(p:unknown)=>self.postMessage({progress:p})});
 const speech=await model as (audio:Float32Array,options:Record<string,unknown>)=>Promise<unknown>;const result=await speech(e.data.audio,{language:'korean',task:'transcribe',return_timestamps:true,chunk_length_s:30,stride_length_s:5});
 self.postMessage({result});
 }catch{model=undefined;self.postMessage({error:'이 기기에서 녹음을 읽지 못했습니다. 지원 브라우저와 여유 메모리를 확인해 주세요.'});}};
