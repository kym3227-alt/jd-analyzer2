export default async function handler(req, res) {
    // CORS 설정
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { jdText } = req.body;

    if (!jdText) {
        return res.status(400).json({ error: 'JD 텍스트가 필요합니다.' });
    }

    try {
        const apiKey = process.env.GEMINI_API_KEY;
        
        if (!apiKey) {
            throw new Error('API 키가 설정되지 않았습니다.');
        }

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `다음 채용공고를 분석해서 JSON 형식으로 정리해줘. 각 필드에 해당하는 정보를 추출하되, 없는 정보는 "정보 없음"으로 표시해줘.

채용공고:
${jdText}

다음 형식의 JSON으로만 응답해줘:
{
  "회사명": "",
  "포지션명": "",
  "회사소개": "",
  "급여": "",
  "회사위치": "",
  "지원자격": "",
  "우대사항": "",
  "주요업무": "",
  "기타": ""
}

설명 없이 JSON만 출력해줘.`
                    }]
                }]
            })
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error('Gemini API Error:', errorData);
            throw new Error(`Gemini API 응답 실패: ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
            throw new Error('API 응답 형식이 올바르지 않습니다.');
        }
        
        const resultText = data.candidates[0].content.parts[0].text;
        
        // JSON 추출
        const jsonMatch = resultText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('JSON 파싱 실패');
        }
        
        const parsedData = JSON.parse(jsonMatch[0]);
        res.status(200).json(parsedData);
        
    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).json({ 
            error: '분석 중 오류가 발생했습니다.',
            details: error.message 
        });
    }
}
