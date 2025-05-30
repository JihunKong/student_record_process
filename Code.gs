// Code.gs - 확장된 통합 학습기록 관리 시스템

/**
 * 전체 워크플로우 상태 관리 시스템
 */
class WorkflowManager {
  constructor() {
    this.properties = PropertiesService.getScriptProperties();
    this.steps = {
      SETUP: 'setup',
      EVALUATION_CREATED: 'evaluation_created',
      RESPONSES_COLLECTED: 'responses_collected', 
      SETECH_GENERATED: 'setech_generated',
      STUDENT_SYSTEM_READY: 'student_system_ready',
      FEEDBACK_COLLECTED: 'feedback_collected',
      COMPLETED: 'completed'
    };
  }

  getCurrentStep() {
    return this.properties.getProperty('CURRENT_STEP') || this.steps.SETUP;
  }

  updateStep(step) {
    this.properties.setProperty('CURRENT_STEP', step);
    this.properties.setProperty(`${step}_TIMESTAMP`, new Date().toISOString());
    this.sendStepNotification(step);
  }

  sendStepNotification(step) {
    const messages = {
      [this.steps.EVALUATION_CREATED]: '✅ 자기평가서가 생성되었습니다. 학생들에게 배포해주세요.',
      [this.steps.RESPONSES_COLLECTED]: '📊 충분한 응답이 수집되었습니다. 세특 생성을 시작할 수 있습니다.',
      [this.steps.SETECH_GENERATED]: '🎯 세특이 생성되었습니다. 학생 열람 시스템을 설정해주세요.',
      [this.steps.STUDENT_SYSTEM_READY]: '👥 학생 열람 시스템이 준비되었습니다. 접속 정보를 배포해주세요.',
      [this.steps.FEEDBACK_COLLECTED]: '💬 학생 피드백이 수집되었습니다. 최종 검토를 진행해주세요.',
      [this.steps.COMPLETED]: '🎉 모든 과정이 완료되었습니다!'
    };

    if (messages[step]) {
      this.showNotification(messages[step]);
    }
  }

  showNotification(message) {
    try {
      const ui = SpreadsheetApp.getUi();
      ui.alert('진행 상황 알림', message, ui.ButtonSet.OK);
    } catch (error) {
      console.log('알림:', message);
    }
  }

  generateChecklist() {
    const currentStep = this.getCurrentStep();
    const checklist = [];

    const stepItems = {
      [this.steps.SETUP]: [
        'OpenAI API 키 설정',
        '영역 선택 (교과/비교과)',
        '평가 정보 입력',
        '활동 내용 정리'
      ],
      [this.steps.EVALUATION_CREATED]: [
        '자기평가서 URL 확인',
        '학생들에게 배포',
        '응답 마감일 공지',
        '질문 대응 준비'
      ],
      [this.steps.RESPONSES_COLLECTED]: [
        '응답 현황 모니터링',
        '미응답 학생 독려',
        '응답 품질 사전 점검',
        'GPT 설정 확인'
      ],
      [this.steps.SETECH_GENERATED]: [
        'AI 생성 세특 검토',
        '개별 학생 특성 반영 확인',
        '필요시 수동 수정',
        '학생 정보 시트 준비'
      ],
      [this.steps.STUDENT_SYSTEM_READY]: [
        '학생 계정 생성 확인',
        '웹앱 URL 테스트',
        '로그인 정보 배포',
        '사용법 안내'
      ],
      [this.steps.FEEDBACK_COLLECTED]: [
        '피드백 내용 검토',
        '세특 최종 수정',
        '품질 최종 확인',
        '학생부 반영 준비'
      ]
    };

    Object.keys(stepItems).forEach(step => {
      const isCompleted = this.isStepCompleted(step, currentStep);
      const isCurrent = step === currentStep;
      
      checklist.push({
        step: step,
        title: this.getStepTitle(step),
        items: stepItems[step],
        status: isCompleted ? 'completed' : (isCurrent ? 'current' : 'pending'),
        timestamp: this.properties.getProperty(`${step}_TIMESTAMP`)
      });
    });

    return checklist;
  }

  isStepCompleted(step, currentStep) {
    const stepOrder = Object.values(this.steps);
    const stepIndex = stepOrder.indexOf(step);
    const currentIndex = stepOrder.indexOf(currentStep);
    return stepIndex < currentIndex;
  }

  getStepTitle(step) {
    const titles = {
      [this.steps.SETUP]: '초기 설정',
      [this.steps.EVALUATION_CREATED]: '자기평가서 생성',
      [this.steps.RESPONSES_COLLECTED]: '응답 수집',
      [this.steps.SETECH_GENERATED]: '세특 생성',
      [this.steps.STUDENT_SYSTEM_READY]: '학생 시스템 설정',
      [this.steps.FEEDBACK_COLLECTED]: '피드백 수집',
      [this.steps.COMPLETED]: '완료'
    };
    return titles[step] || '알 수 없는 단계';
  }
}

// 전체 워크플로우 관리자 인스턴스
const workflow = new WorkflowManager();

/**
 * 메뉴 생성
 */
function onOpen() {
  try {
    const ui = SpreadsheetApp.getUi();
    ui.createMenu('📚 학습기록 통합 시스템')
      .addItem('🎯 통합 대시보드 열기', 'showDashboard')
      .addSeparator()
      .addItem('1️⃣ 자기평가서 생성', 'startEvaluationCreation')
      .addItem('2️⃣ 응답 현황 확인', 'checkResponseStatus')
      .addItem('3️⃣ 세특 자동 생성', 'startSetechGeneration')
      .addItem('4️⃣ 학생 시스템 설정', 'setupStudentSystem')
      .addSeparator()
      .addItem('📊 진행 상황 확인', 'showProgress')
      .addItem('⚙️ 설정 초기화', 'resetWorkflow')
      .addToUi();
  } catch (error) {
    console.log('메뉴 생성 오류:', error);
  }
}

/**
 * 1단계: 자기평가서 생성 (영역 선택 포함)
 */
function startEvaluationCreation() {
  const currentStep = workflow.getCurrentStep();
  
  if (currentStep !== workflow.steps.SETUP) {
    SpreadsheetApp.getUi().alert('알림', '이미 자기평가서가 생성되었습니다.', SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }
  
  const html = HtmlService.createHtmlOutputFromFile('EvaluationSelector')
    .setTitle('자기평가서 생성')
    .setWidth(600)
    .setHeight(700);
  
  SpreadsheetApp.getUi().showModalDialog(html, '1단계: 자기평가서 생성');
}

/**
 * 교과 세특용 자기평가서 생성
 */
async function createSubjectEvaluation(data) {
  try {
    const form = FormApp.create(`${data.subject} 교과 자기평가서 - ${new Date().toLocaleDateString()}`);
    
    // 기본 정보 섹션
    form.addSectionHeaderItem().setTitle('기본 정보');
    form.addTextItem().setTitle('학번').setRequired(true);
    form.addTextItem().setTitle('이름').setRequired(true);

    // 교과 정보 섹션
    form.addSectionHeaderItem().setTitle(`${data.subject} 교과 자기평가`);
    
    // AI 질문 생성
    try {
      const questions = await generateSubjectQuestions(data);
      
      questions.forEach((question, index) => {
        if (question && question.trim().length > 0) {
          form.addParagraphTextItem()
            .setTitle(`${index + 1}. ${question}`)
            .setRequired(true);
        }
      });
    } catch (error) {
      console.warn('AI 질문 생성 실패, 기본 질문 사용:', error);
      
      const defaultQuestions = [
        '이번 수업을 통해 가장 인상 깊었던 활동이나 내용은 무엇이었나요?',
        '수업 활동 중에서 자신의 성장을 가장 잘 보여주는 사례는 무엇인가요?',
        '협력 활동에서 자신이 어떤 역할을 했고, 어떤 기여를 했나요?',
        '어려웠던 과제나 문제를 어떻게 해결했나요?',
        '이번 수업을 통해 새롭게 깨달은 점이나 배운 점은 무엇인가요?'
      ];
      
      defaultQuestions.forEach((question, index) => {
        form.addParagraphTextItem()
          .setTitle(`${index + 1}. ${question}`)
          .setRequired(true);
      });
    }

    // 추가 성찰 섹션
    form.addSectionHeaderItem().setTitle('추가 성찰');
    form.addParagraphTextItem()
      .setTitle('이번 학기 수업을 통해 자신에게 일어난 가장 큰 변화나 성장은 무엇이라고 생각하나요?')
      .setRequired(true);
    form.addParagraphTextItem()
      .setTitle('앞으로의 학습에서 특별히 발전시키고 싶은 부분이 있다면 무엇인가요?')
      .setRequired(true);

    return await finalizeFormCreation(form, data.subject, 'subject');
    
  } catch (error) {
    console.error('교과 자기평가서 생성 오류:', error);
    return {
      success: false,
      message: '교과 자기평가서 생성 중 오류가 발생했습니다: ' + error.message
    };
  }
}

/**
 * 비교과 세특용 자기평가서 생성
 */
async function createNonSubjectEvaluation(data) {
  try {
    const categoryNames = {
      '자율': '자율활동',
      '진로': '진로활동', 
      '동아리': '동아리활동',
      '행발': '행동특성 및 종합의견'
    };
    
    const categoryName = categoryNames[data.category];
    const form = FormApp.create(`${categoryName} 자기평가서 - ${new Date().toLocaleDateString()}`);
    
    // 기본 정보 섹션
    form.addSectionHeaderItem().setTitle('기본 정보');
    form.addTextItem().setTitle('학번').setRequired(true);
    form.addTextItem().setTitle('이름').setRequired(true);

    // 활동별 질문 생성
    const questionsData = await generateNonSubjectQuestions(data);
    
    // 활동별 섹션 및 질문 추가
    questionsData.forEach((section, index) => {
      // 페이지 구분 추가
      if (index === 0) {
        form.addPageBreakItem()
          .setTitle(section.activity)
          .setHelpText('아래 질문들에 대해 구체적으로 답변해 주세요.');
      } else {
        form.addPageBreakItem()
          .setTitle(section.activity)
          .setHelpText('아래 질문들에 대해 구체적으로 답변해 주세요.');
      }
      
      // 질문 추가
      section.questions.forEach(question => {
        form.addParagraphTextItem()
          .setTitle(question)
          .setRequired(true);
      });
    });

    return await finalizeFormCreation(form, categoryName, 'non-subject');
    
  } catch (error) {
    console.error('비교과 자기평가서 생성 오류:', error);
    return {
      success: false,
      message: '비교과 자기평가서 생성 중 오류가 발생했습니다: ' + error.message
    };
  }
}

/**
 * 폼 생성 마무리 (공통)
 */
async function finalizeFormCreation(form, title, type) {
  // 응답 수집용 스프레드시트 생성
  const spreadsheet = SpreadsheetApp.create(`${title} 응답관리 - ${new Date().toLocaleDateString()}`);
  
  // 폼과 스프레드시트 연결
  form.setDestination(FormApp.DestinationType.SPREADSHEET, spreadsheet.getId());
  
  // 워크플로우 상태 업데이트
  workflow.properties.setProperties({
    'FORM_URL': form.getPublishedUrl(),
    'SPREADSHEET_URL': spreadsheet.getUrl(),
    'FORM_ID': form.getId(),
    'SPREADSHEET_ID': spreadsheet.getId(),
    'EVALUATION_TYPE': type,
    'EVALUATION_TITLE': title
  });
  
  workflow.updateStep(workflow.steps.EVALUATION_CREATED);
  
  return {
    success: true,
    formUrl: form.getPublishedUrl(),
    spreadsheetUrl: spreadsheet.getUrl(),
    message: '자기평가서가 성공적으로 생성되었습니다!'
  };
}

/**
 * 교과 질문 생성
 */
async function generateSubjectQuestions(data) {
  const prompt = `
당신은 학생들의 깊이 있는 자기성찰을 이끌어내는 교육 전문가입니다. 
다음 정보를 바탕으로 학생 자기평가를 위한 질문들을 생성해주세요.

교과: ${data.subject}
성취기준: ${data.achievement}
학생 활동 내용: ${data.activities}

다음 관점들을 균형있게 포함한 8개의 질문을 생성해주세요:
1. 학습 과정에서의 성장과 변화
2. 역량 개발 및 교과 연계성
3. 창의적 사고와 문제해결
4. 메타인지와 자기성찰

각 질문은:
- 구체적인 경험이나 사례를 끌어낼 수 있도록 작성
- 깊이 있는 성찰을 유도하는 질문
- 질문형으로 작성 (명령형 X)

예시: "수업 활동을 통해 자신의 생각이나 느낌을 효과적으로 전달할 수 있었던 구체적인 사례는 무엇인가요?"

8개의 질문만 번호 없이 생성해주세요.`;

  return await callGPTAPI(data.apiKey, prompt, true);
}

/**
 * 비교과 질문 생성
 */
async function generateNonSubjectQuestions(data) {
  const categoryPrompts = {
    '자율': {
      focus: "자율활동",
      keywords: "주도성, 창의성, 협력, 문제해결",
      points: ["활동의 주도성과 자발성", "구체적 사례와 배움", "확장·연계 가능성"]
    },
    '진로': {
      focus: "진로활동",
      keywords: "진로탐색, 목표설정, 실천노력, 변화과정",
      points: ["진로 탐색 과정", "구체적 실천", "성장과 변화"]
    },
    '동아리': {
      focus: "동아리활동",
      keywords: "전문성, 협동, 리더십, 성과",
      points: ["역할과 책임", "전문성 개발", "협력과 성과"]
    },
    '행발': {
      focus: "행동특성",
      keywords: "인성, 태도, 관계, 성장",
      points: ["학교생활 태도", "대인관계", "인성 발달"]
    }
  };

  const promptInfo = categoryPrompts[data.category];
  const activityList = data.activities.split('\n')
                       .filter(activity => activity.trim())
                       .map(activity => activity.trim());
  
  const prompt = `학교생활기록부 ${promptInfo.focus} 영역의 세부특기사항 작성을 위한 자기평가 질문을 생성해주세요.

[입력받은 활동 내용]
${activityList.map((activity, index) => `${index + 1}. ${activity}`).join('\n')}

[평가 중점 요소]
• 핵심 키워드: ${promptInfo.keywords}
• 평가 포인트: ${promptInfo.points.join(', ')}

[요청 사항]
1. 각 활동별로 정확히 5개의 질문을 생성해주세요.
2. 각 활동의 시작에는 반드시 ===활동시작===을 포함해주세요.
3. 활동명 앞에는 <<를, 뒤에는 >>를 붙여주세요.
4. 각 질문 앞에는 숫자와 점(예: 1. )을 붙여주세요.

[응답 형식 예시]
===활동시작===
<<학교 축제 부스 운영>>
1. 부스 운영에서 본인의 역할은 무엇이었나요?
2. 부스 기획 단계에서 가장 중점을 둔 부분은 무엇인가요?
3. 운영 과정에서 어떤 어려움이 있었고 어떻게 해결했나요?
4. 팀원들과의 협업 과정에서 배운 점은 무엇인가요?
5. 이 경험이 자신의 성장에 어떤 영향을 주었나요?`;

  const content = await callGPTAPI(data.apiKey, prompt, false);
  
  // 활동별 섹션 파싱
  const sections = content.split('===활동시작===')
                    .filter(section => section.trim());
  
  return sections.map(section => {
    const lines = section.trim().split('\n');
    const activityName = lines[0].match(/<<(.+)>>/)[1];
    
    const questions = lines
      .filter(line => /^\d+\./.test(line.trim()))
      .map(line => line.replace(/^\d+\.\s*/, '').trim())
      .filter(question => question.length > 0);

    return {
      activity: activityName,
      questions: questions
    };
  });
}

/**
 * GPT API 호출
 */
async function callGPTAPI(apiKey, prompt, isSubjectType) {
  const url = 'https://api.openai.com/v1/chat/completions';
  const payload = {
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: isSubjectType ? 
          "당신은 교육 전문가입니다." : 
          "당신은 학교생활기록부 세부특기사항 작성을 돕는 전문가입니다."
      },
      {
        role: "user",
        content: prompt
      }
    ],
    temperature: 0.7
  };

  const options = {
    method: 'post',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    const response = await UrlFetchApp.fetch(url, options);
    
    if (response.getResponseCode() !== 200) {
      throw new Error(`API 오류: ${response.getResponseCode()}`);
    }

    const result = JSON.parse(response.getContentText());
    
    if (result.error) {
      throw new Error(result.error.message || '알 수 없는 오류가 발생했습니다.');
    }

    const content = result.choices[0].message.content;
    
    if (isSubjectType) {
      // 교과용: 질문 리스트 반환
      const questions = content.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 10 && line.includes('?'))
        .map(line => line.replace(/^\d+\.\s*/, ''))
        .slice(0, 8);

      return questions.length > 0 ? questions : ['기본 질문이 생성되었습니다.'];
    } else {
      // 비교과용: 원본 텍스트 반환 (파싱은 호출자에서)
      return content;
    }
    
  } catch (error) {
    console.error('GPT API 호출 오류:', error);
    throw error;
  }
}

/**
 * 2단계: 응답 현황 확인
 */
function checkResponseStatus() {
  const spreadsheetUrl = workflow.properties.getProperty('SPREADSHEET_URL');
  if (!spreadsheetUrl) {
    SpreadsheetApp.getUi().alert('오류', '먼저 자기평가서를 생성해주세요.', SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }
  
  const responseCount = getCurrentResponseCount();
  
  const ui = SpreadsheetApp.getUi();
  const result = ui.alert(
    '응답 현황',
    `현재 ${responseCount}명이 응답했습니다.\n\n응답 관리 스프레드시트를 열어보시겠습니까?`,
    ui.ButtonSet.YES_NO
  );
  
  if (result === ui.Button.YES) {
    ui.alert('안내', `다음 링크로 이동해주세요:\n${spreadsheetUrl}`, ui.ButtonSet.OK);
  }
  
  if (responseCount >= 5) {
    workflow.updateStep(workflow.steps.RESPONSES_COLLECTED);
  }
}

/**
 * 현재 응답 수 확인
 */
function getCurrentResponseCount() {
  try {
    const spreadsheetId = workflow.properties.getProperty('SPREADSHEET_ID');
    if (!spreadsheetId) return 0;
    
    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    const sheets = spreadsheet.getSheets();
    
    let responseSheet = null;
    for (let sheet of sheets) {
      const name = sheet.getName();
      if (name.includes('응답') || name.includes('Response')) {
        responseSheet = sheet;
        break;
      }
    }
    
    if (responseSheet) {
      return Math.max(0, responseSheet.getLastRow() - 1);
    }
    return 0;
  } catch (error) {
    console.error('응답 수 확인 오류:', error);
    return 0;
  }
}

/**
 * 3단계: 세특 자동 생성
 */
function startSetechGeneration() {
  const currentStep = workflow.getCurrentStep();
  
  if (currentStep === workflow.steps.SETUP || currentStep === workflow.steps.EVALUATION_CREATED) {
    const responseCount = getCurrentResponseCount();
    if (responseCount === 0) {
      SpreadsheetApp.getUi().alert('알림', '아직 학생 응답이 없습니다. 응답을 수집한 후 다시 시도해주세요.', SpreadsheetApp.getUi().ButtonSet.OK);
      return;
    }
  }
  
  const html = HtmlService.createHtmlOutputFromFile('SetechGenerator')
    .setTitle('세특 자동 생성')
    .setWidth(400)
    .setHeight(300);
  
  SpreadsheetApp.getUi().showModalDialog(html, '3단계: 세특 자동 생성');
}

/**
 * 세특 생성 실행
 */
function executeSetechGeneration(apiKey) {
  try {
    const spreadsheetId = workflow.properties.getProperty('SPREADSHEET_ID');
    if (!spreadsheetId) {
      throw new Error('응답 스프레드시트를 찾을 수 없습니다.');
    }
    
    const evaluationType = workflow.properties.getProperty('EVALUATION_TYPE');
    const result = generateSetechFromResponses(spreadsheetId, apiKey, evaluationType);
    
    workflow.updateStep(workflow.steps.SETECH_GENERATED);
    
    return {
      success: true,
      message: result,
      nextStep: '학생 열람 시스템 설정을 진행해주세요.'
    };
  } catch (error) {
    return {
      success: false,
      message: `세특 생성 중 오류가 발생했습니다: ${error.message}`
    };
  }
}

/**
 * 응답 데이터로부터 세특 생성 (교과/비교과 구분)
 */
function generateSetechFromResponses(spreadsheetId, apiKey, evaluationType) {
  const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  const sheets = spreadsheet.getSheets();
  
  let responseSheet = null;
  for (let sheet of sheets) {
    const name = sheet.getName();
    if (name.includes('응답') || name.includes('Response')) {
      responseSheet = sheet;
      break;
    }
  }
  
  if (!responseSheet) {
    throw new Error('응답 시트를 찾을 수 없습니다.');
  }
  
  const data = responseSheet.getDataRange().getValues();
  if (data.length < 2) {
    throw new Error('응답 데이터가 없습니다.');
  }
  
  const headers = data[0];
  let processedCount = 0;
  
  // 세특 열이 없으면 추가
  const setechColIndex = headers.length;
  responseSheet.getRange(1, setechColIndex + 1).setValue('생성된 세특');
  
  // 각 응답에 대해 세특 생성
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    
    if (!row[1] || !row[2]) continue; // 학번, 이름 확인
    
    const responses = row.slice(3).filter(response => response && response.toString().trim());
    if (responses.length === 0) continue;
    
    // 평가 유형에 따른 프롬프트 생성
    const prompt = generateSetechPrompt(responses, evaluationType);
    
    try {
      const setech = callGPTForSetech(apiKey, prompt);
      responseSheet.getRange(i + 1, setechColIndex + 1).setValue(setech);
      processedCount++;
      
      Utilities.sleep(1000);
    } catch (error) {
      console.error(`${i}번째 행 처리 오류:`, error);
      responseSheet.getRange(i + 1, setechColIndex + 1).setValue('오류: ' + error.message);
    }
  }
  
  return `총 ${processedCount}개의 세특이 생성되었습니다.`;
}

/**
 * 세특 생성 프롬프트 (교과/비교과 구분)
 */
function generateSetechPrompt(responses, evaluationType) {
  const basePrompt = `다음은 학생의 자기평가 응답입니다:

${responses.map((resp, idx) => `${idx + 1}. ${resp}`).join('\n\n')}

위 응답을 바탕으로 다음 조건에 맞는 세부특기사항을 작성해주세요:
1. 학생의 성장과 발달이 드러나도록 작성
2. 구체적인 역량을 명시
3. 관찰 중심의 서술 ('-음', '-함' 어미 사용)
4. 한 단락, 약 300자 분량
5. '학생은' 주어 생략`;

  if (evaluationType === 'subject') {
    return basePrompt + `
6. 교과 학습 과정에서의 성취와 특성 중심으로 서술
7. 교과 역량 및 성취기준 연계하여 작성

교사의 교과 수업 관찰 관점에서 서술해주세요.`;
  } else {
    return basePrompt + `
6. 활동 과정에서의 참여도와 기여도 중심으로 서술  
7. 인성, 창의성, 협력 등의 특성이 드러나도록 작성

교사의 비교과 활동 관찰 관점에서 서술해주세요.`;
  }
}

/**
 * 세특 생성용 GPT 호출
 */
function callGPTForSetech(apiKey, prompt) {
  const response = UrlFetchApp.fetch('https://api.openai.com/v1/chat/completions', {
    method: 'post',
    headers: {
      'Authorization': 'Bearer ' + apiKey,
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 1000
    }),
    muteHttpExceptions: true
  });

  if (response.getResponseCode() !== 200) {
    throw new Error(`API 오류: ${response.getResponseCode()}`);
  }

  const result = JSON.parse(response.getContentText());
  return result.choices[0].message.content.trim();
}

/**
 * 4단계: 학생 시스템 설정
 */
function setupStudentSystem() {
  const currentStep = workflow.getCurrentStep();
  
  if (currentStep !== workflow.steps.SETECH_GENERATED) {
    SpreadsheetApp.getUi().alert('알림', '먼저 세특 생성을 완료해주세요.', SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }
  
  try {
    createStudentDataSheets();
    
    const webAppUrl = `https://script.google.com/macros/d/${ScriptApp.newTrigger('doGet').getProjectId()}/exec`;
    
    workflow.properties.setProperty('WEBAPP_URL', webAppUrl);
    workflow.updateStep(workflow.steps.STUDENT_SYSTEM_READY);
    
    SpreadsheetApp.getUi().alert(
      '완료',
      `학생 열람 시스템이 설정되었습니다.\n\n웹앱을 배포하여 학생들에게 URL을 제공해주세요.\n\n현재 스프레드시트에서 로그인 정보를 확인할 수 있습니다.`,
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    
  } catch (error) {
    SpreadsheetApp.getUi().alert('오류', `시스템 설정 중 오류가 발생했습니다: ${error.message}`, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * 학생용 데이터 시트 생성
 */
function createStudentDataSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  let dataSheet = ss.getSheetByName('열람 정보');
  if (!dataSheet) {
    dataSheet = ss.insertSheet('열람 정보');
    const headers = ['학번', '이름', '학년', '반', '번호', '과목/영역', '단원/활동', '평가명', '점수', '세부특기사항'];
    dataSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    dataSheet.getRange(1, 1, 1, headers.length).setBackground('#f3f3f3').setFontWeight('bold');
  }
  
  let loginSheet = ss.getSheetByName('로그인정보');
  if (!loginSheet) {
    loginSheet = ss.insertSheet('로그인정보');
    loginSheet.getRange(1, 1, 1, 2).setValues([['학번', '비밀번호']]);
    loginSheet.getRange(1, 1, 1, 2).setBackground('#f3f3f3').setFontWeight('bold');
    
    const sampleLogins = [
      ['2301', 'pass1234'],
      ['2302', 'pass5678'],
      ['2303', 'pass9012']
    ];
    loginSheet.getRange(2, 1, sampleLogins.length, 2).setValues(sampleLogins);
  }
  
  let feedbackSheet = ss.getSheetByName('피드백 정보');
  if (!feedbackSheet) {
    feedbackSheet = ss.insertSheet('피드백 정보');
    const feedbackHeaders = ['학번', '제출일시', '추가하고 싶은 내용', '드러내고 싶은 역량', '삭제하고 싶은 내용'];
    feedbackSheet.getRange(1, 1, 1, feedbackHeaders.length).setValues([feedbackHeaders]);
    feedbackSheet.getRange(1, 1, 1, feedbackHeaders.length).setBackground('#f3f3f3').setFontWeight('bold');
  }
}

/**
 * 진행 상황 확인
 */
function showProgress() {
  const checklist = workflow.generateChecklist();
  const currentStep = workflow.getCurrentStep();
  
  let message = '📊 현재 진행 상황\n\n';
  
  checklist.forEach((item) => {
    const statusIcon = {
      'completed': '✅',
      'current': '🔄',
      'pending': '⏳'
    }[item.status];
    
    message += `${statusIcon} ${item.title}\n`;
    
    if (item.status === 'current') {
      message += '   📋 해야할 일:\n';
      item.items.forEach(task => {
        message += `   • ${task}\n`;
      });
      message += '\n';
    }
  });
  
  const nextSteps = {
    [workflow.steps.SETUP]: '자기평가서 생성을 시작하세요.',
    [workflow.steps.EVALUATION_CREATED]: '학생들의 응답을 기다리고 있습니다.',
    [workflow.steps.RESPONSES_COLLECTED]: '세특 자동 생성을 시작할 수 있습니다.',
    [workflow.steps.SETECH_GENERATED]: '학생 열람 시스템을 설정하세요.',
    [workflow.steps.STUDENT_SYSTEM_READY]: '학생들의 피드백을 수집하고 있습니다.',
    [workflow.steps.COMPLETED]: '모든 과정이 완료되었습니다! 🎉'
  };
  
  message += `\n💡 다음 단계: ${nextSteps[currentStep]}`;
  
  SpreadsheetApp.getUi().alert('진행 상황', message, SpreadsheetApp.getUi().ButtonSet.OK);
}

/**
 * 워크플로우 초기화
 */
function resetWorkflow() {
  const ui = SpreadsheetApp.getUi();
  const result = ui.alert(
    '초기화 확인',
    '모든 진행 상황을 초기화하시겠습니까?\n이 작업은 되돌릴 수 없습니다.',
    ui.ButtonSet.YES_NO
  );
  
  if (result === ui.Button.YES) {
    const properties = PropertiesService.getScriptProperties();
    properties.deleteProperty('CURRENT_STEP');
    properties.deleteProperty('FORM_URL');
    properties.deleteProperty('SPREADSHEET_URL');
    properties.deleteProperty('FORM_ID');
    properties.deleteProperty('SPREADSHEET_ID');
    properties.deleteProperty('EVALUATION_TYPE');
    properties.deleteProperty('EVALUATION_TITLE');
    properties.deleteProperty('WEBAPP_URL');
    
    Object.values(workflow.steps).forEach(step => {
      properties.deleteProperty(`${step}_TIMESTAMP`);
    });
    
    ui.alert('완료', '워크플로우가 초기화되었습니다.', ui.ButtonSet.OK);
  }
}

/**
 * 통합 대시보드 표시
 */
function showDashboard() {
  const html = HtmlService.createHtmlOutputFromFile('Dashboard')
    .setTitle('학습기록 통합 관리 대시보드')
    .setWidth(1200)
    .setHeight(800);
  
  SpreadsheetApp.getUi().showModalDialog(html, '통합 대시보드');
}

/**
 * 대시보드 데이터 제공
 */
function getDashboardData() {
  const currentStep = workflow.getCurrentStep();
  const checklist = workflow.generateChecklist();
  
  return {
    currentStep: currentStep,
    checklist: checklist,
    urls: {
      form: workflow.properties.getProperty('FORM_URL'),
      spreadsheet: workflow.properties.getProperty('SPREADSHEET_URL'),
      webapp: workflow.properties.getProperty('WEBAPP_URL')
    },
    stats: {
      responseCount: getCurrentResponseCount(),
      completedSteps: checklist.filter(item => item.status === 'completed').length,
      evaluationType: workflow.properties.getProperty('EVALUATION_TYPE'),
      evaluationTitle: workflow.properties.getProperty('EVALUATION_TITLE')
    }
  };
}

/**
 * 웹앱 진입점 (학생용)
 */
function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('StudentIndex')
    .setTitle('학습 기록 열람 시스템')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * 학생 로그인 검증
 */
function validateUser(studentId, password) {
  try {
    const loginSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('로그인정보');
    if (!loginSheet) return false;
    
    const credentials = loginSheet.getDataRange().getValues();
    
    for (let row of credentials) {
      if (row[0] == studentId && row[1] == password) {
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error('로그인 검증 오류:', error);
    return false;
  }
}

/**
 * 학생 데이터 조회
 */
function getStudentData(studentId) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('열람 정보');
    if (!sheet) return null;
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] == studentId) {
        return {
          headers: headers,
          data: data[i]
        };
      }
    }
    return null;
  } catch (error) {
    console.error('학생 데이터 조회 오류:', error);
    return null;
  }
}

/**
 * 학생 피드백 저장
 */
function saveFeedback(studentId, addContent, showSkills, deleteContent) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('피드백 정보');
    if (!sheet) return false;
    
    const lastRow = Math.max(sheet.getLastRow(), 1);
    const timestamp = new Date().toLocaleString("ko-KR", {timeZone: "Asia/Seoul"});
    
    sheet.getRange(lastRow + 1, 1, 1, 5).setValues([[
      studentId,
      timestamp,
      addContent,
      showSkills,
      deleteContent
    ]]);
    
    return true;
  } catch (error) {
    console.error('피드백 저장 오류:', error);
    return false;
  }
}
