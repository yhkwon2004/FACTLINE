from worker import run
context='2026년 5월 12일 교실에서 민수가 팔을 때렸다고 기록했다.'
response=run('chat',dict(question='누가 어떤 행동을 했다고 적혀 있나요?',context=context))
assert '민수' in response['answer'] and '팔' in response['answer'],response
structured=run('structure',dict(answer=context))
assert structured['cleanedStatement']==context
assert structured['isApproximateTime']
assert structured['actor'] is None or structured['actor'] in context
payment='인물A는 인물B에게 5만원을 송금했다.'
for question in ('사기죄가 성립하나요?', '이 사건에서 벌금은 얼마인가요?'):
    legal=run('chat',dict(question=question,context=payment))
    assert legal['method']=='legal-checklist', legal
    issue=legal['coverage']['issues'][0]
    assert issue['title']=='금전·차용' and payment in [c['quote']+'.' for c in issue['checks'] if c['quote']]
    assert any(c['status']=='missing' for c in issue['checks'])
    assert any(ref['citation'].startswith('형법 제347조') for ref in issue['references'])
    assert legal['references'] and all('law.go.kr/' in ref['sourceUrl'] for ref in legal['references'])
assert 'method' not in run('chat',dict(question='시간 순서로 정리하는 방법은?',context=''))
print('LEGAL_CHAT_GUARD_PASS current corpus citation, payment quote and missing checks',flush=True)
print('LLM_FACT_ANSWER_PASS',response['answer'],flush=True)
print('LORA_SOURCE_VALIDATION_PASS',structured,flush=True)
