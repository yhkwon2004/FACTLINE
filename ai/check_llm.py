from worker import run
context='2026년 5월 12일 교실에서 민수가 팔을 때렸다고 기록했다.'
response=run('chat',dict(question='누가 어떤 행동을 했다고 적혀 있나요?',context=context))
assert '민수' in response['answer'] and '팔' in response['answer'],response
structured=run('structure',dict(answer=context))
assert structured['cleanedStatement']==context
assert structured['isApproximateTime']
assert structured['actor'] is None or structured['actor'] in context
print('LLM_FACT_ANSWER_PASS',response['answer'],flush=True)
print('LORA_SOURCE_VALIDATION_PASS',structured,flush=True)
