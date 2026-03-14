from __future__ import annotations

import json
import os
import re
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, List, Optional
from urllib.parse import unquote
from uuid import uuid4

import io
import PyPDF2
import docx
import base64
import httpx
from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
DB_PATH = DATA_DIR / "zk_writing_coach.db"
DEFAULT_MODEL = "custom-zenmux-ai/openai/gpt-5.4"
ZENMUX_BASE_URL = os.getenv("ZENMUX_BASE_URL", "https://zenmux.ai/api/v1")
ZENMUX_API_KEY = os.getenv("ZENMUX_API_KEY")

SYSTEM_PROMPT = """你是一个专业的中国中考英语作文批改老师。请严格按照以下 JSON 结构返回，不要输出任何 JSON 之外的内容。

评分目标：
1. 依据中考英语作文常见标准，从内容切题、语言准确性、结构连贯、词汇句式四个维度综合判断。
2. 分数范围 1-15，必须给整数。
3. level 只允许 A / B / C / D。
4. strengths 给出 2-4 条优点，必须具体。
5. improvements 给出 2-4 条改进建议，必须可执行。
6. sentence_suggestions 给出 2-4 条句子级修改建议，每条都要包含 original / improved / reason。
7. polished_essay 输出一版适合中考场景的润色参考作文，保留原意但更自然准确。
8. 如果用户上传的是图片，请仔细识别图片中的手写内容，以此作为“学生作文”进行批改。
8. error_tags 输出 2-5 个错误标签，只能从这些标签中选择：时态、拼写、连接词、语法、结构、审题、句式、表达。
9. training_suggestions 输出 2-4 条下一步训练建议，要具体、可执行、面向教练安排训练。

返回 JSON schema：
{
  "score": 12,
  "level": "B",
  "strengths": ["..."],
  "improvements": ["..."],
  "sentence_suggestions": [
    {
      "original": "...",
      "improved": "...",
      "reason": "..."
    }
  ],
  "polished_essay": "...",
  "error_tags": ["时态", "连接词"],
  "training_suggestions": ["针对连接词做 10 句改写训练"]
}
"""

ALLOWED_ERROR_TAGS = ["时态", "拼写", "连接词", "语法", "结构", "审题", "句式", "表达"]

app = FastAPI(
    title="ZK Writing Coach API",
    version="0.5.0",
    description="英语作文教练后端 API（支持中高考、文件解析）（真实 AI 批改 + SQLite 持久化 + 报告接口）",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class Suggestion(BaseModel):
    original: str
    improved: str
    reason: str


class GradeRequest(BaseModel):
    prompt: str = Field(..., description="作文题目")
    essay: str = Field(..., min_length=1, description="学生作文内容")
    student_name: Optional[str] = Field(default=None, description="学生姓名")


class GradeResponse(BaseModel):
    submission_id: str
    score: int
    level: str
    strengths: List[str]
    improvements: List[str]
    sentence_suggestions: List[Suggestion]
    polished_essay: str
    error_tags: List[str]
    training_suggestions: List[str]
    created_at: str
    engine: str = "ai"


class HistoryItem(BaseModel):
    submission_id: str
    prompt: str
    essay: str
    student_name: Optional[str]
    score: int
    level: str
    strengths: List[str]
    improvements: List[str]
    sentence_suggestions: List[Suggestion]
    polished_essay: str
    error_tags: List[str]
    training_suggestions: List[str]
    created_at: str
    engine: str = "ai"


class StudentSummary(BaseModel):
    student_name: str
    total_submissions: int
    average_score: float
    latest_score: int
    latest_level: str
    last_created_at: str


class TagCount(BaseModel):
    tag: str
    count: int


class StudentNotePayload(BaseModel):
    coach_note: str


class StudentReport(BaseModel):
    student_name: str
    total_submissions: int
    average_score: float
    best_score: int
    latest_score: int
    latest_level: str
    score_trend: List[int]
    top_error_tags: List[TagCount]
    recent_training_suggestions: List[str]
    stage_summary: str
    next_stage_plan: List[str]
    recent_records: List[HistoryItem]
    coach_note: str = ''


@contextmanager
def get_conn():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db() -> None:
    with get_conn() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS grading_records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                submission_id TEXT NOT NULL UNIQUE,
                prompt TEXT NOT NULL,
                essay TEXT NOT NULL,
                student_name TEXT,
                score INTEGER NOT NULL,
                level TEXT NOT NULL,
                strengths_json TEXT NOT NULL,
                improvements_json TEXT NOT NULL,
                sentence_suggestions_json TEXT NOT NULL,
                polished_essay TEXT NOT NULL,
                error_tags_json TEXT NOT NULL DEFAULT '[]',
                training_suggestions_json TEXT NOT NULL DEFAULT '[]',
                created_at TEXT NOT NULL,
                engine TEXT NOT NULL DEFAULT 'rule'
            )
            """
        )

        columns = {row[1] for row in conn.execute("PRAGMA table_info(grading_records)").fetchall()}
        if "engine" not in columns:
            conn.execute("ALTER TABLE grading_records ADD COLUMN engine TEXT NOT NULL DEFAULT 'rule'")
        if "error_tags_json" not in columns:
            conn.execute("ALTER TABLE grading_records ADD COLUMN error_tags_json TEXT NOT NULL DEFAULT '[]'")
        if "training_suggestions_json" not in columns:
            conn.execute("ALTER TABLE grading_records ADD COLUMN training_suggestions_json TEXT NOT NULL DEFAULT '[]'")

        conn.execute(
            '''
            CREATE TABLE IF NOT EXISTS student_notes (
                student_name TEXT PRIMARY KEY,
                coach_note TEXT NOT NULL DEFAULT '',
                updated_at TEXT NOT NULL
            )
            '''
        )


@app.on_event("startup")
def on_startup() -> None:
    init_db()


def normalize_level(score: int) -> str:
    if score >= 13:
        return "A"
    if score >= 10:
        return "B"
    if score >= 7:
        return "C"
    return "D"


def normalize_error_tags(tags: List[str]) -> List[str]:
    normalized = []
    for tag in tags:
        clean = str(tag).strip()
        if clean in ALLOWED_ERROR_TAGS and clean not in normalized:
            normalized.append(clean)
    return normalized or ["表达"]


def fallback_grade(payload: GradeRequest) -> GradeResponse:
    essay = payload.essay.strip()
    word_count = len([w for w in essay.split() if w.strip()])

    base_score = 8
    if word_count >= 40:
        base_score += 2
    if word_count >= 70:
        base_score += 2
    if any(token in essay.lower() for token in ["because", "if", "when", "although", "however"]):
        base_score += 1
    score = max(1, min(base_score, 15))

    sentence_suggestions = [
        Suggestion(
            original="I very like English.",
            improved="I like English very much.",
            reason="副词 very much 的位置更自然，符合常见英文表达。",
        ),
        Suggestion(
            original="We can learns a lot.",
            improved="We can learn a lot.",
            reason="情态动词 can 后面使用动词原形。",
        ),
    ]

    polished_essay = essay if essay.endswith(".") else essay + "."

    return GradeResponse(
        submission_id=str(uuid4()),
        score=score,
        level=normalize_level(score),
        strengths=[
            "内容基本切题，能够围绕题目表达观点。",
            "有一定句子组织能力，文章结构初步完整。",
        ],
        improvements=[
            "可增加连接词，让上下文衔接更自然。",
            "注意动词时态和主谓一致。",
            "结尾可以更完整，形成总结或升华。",
        ],
        sentence_suggestions=sentence_suggestions,
        polished_essay=polished_essay,
        error_tags=["连接词", "语法", "结构"],
        training_suggestions=[
            "围绕连接词做 10 句改写训练，重点练习 because、however、so。",
            "针对主谓一致与动词原形做专项纠错，每次练习 8 句。",
            "每篇作文补写结尾句，强化结构完整性。",
        ],
        created_at=datetime.now(timezone.utc).isoformat(),
        engine="rule",
    )


def extract_json(text: str) -> dict[str, Any]:
    text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    match = re.search(r"\{[\s\S]*\}", text)
    if not match:
        raise ValueError("Model did not return JSON")
    return json.loads(match.group(0))


def build_user_prompt(payload: GradeRequest) -> str:
    student_name = payload.student_name or "未提供"
    return f"""请批改以下中考英语作文，并严格返回 JSON：

学生姓名：{student_name}
作文题目：{payload.prompt}
学生作文：
{payload.essay}
"""


async def call_real_grader(payload: GradeRequest) -> GradeResponse:
    headers = {
        "Authorization": f"Bearer {ZENMUX_API_KEY}",
        "Content-Type": "application/json",
    }
    body = {
        "model": "openai/gpt-5.4",
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": build_user_prompt(payload)},
        ],
        "temperature": 0.3,
        "response_format": {"type": "json_object"},
    }

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(f"{ZENMUX_BASE_URL}/chat/completions", headers=headers, json=body)
        response.raise_for_status()
        data = response.json()

    content = data["choices"][0]["message"]["content"]
    parsed = extract_json(content)

    score = int(parsed.get("score", 10))
    score = max(1, min(score, 15))
    level = parsed.get("level") or normalize_level(score)
    if level not in {"A", "B", "C", "D"}:
        level = normalize_level(score)

    strengths = [str(x) for x in parsed.get("strengths", [])][:4] or ["表达基本清晰。"]
    improvements = [str(x) for x in parsed.get("improvements", [])][:4] or ["建议进一步优化句式和连接词。"]

    sentence_suggestions_raw = parsed.get("sentence_suggestions", [])[:4]
    sentence_suggestions: List[Suggestion] = []
    for item in sentence_suggestions_raw:
        if isinstance(item, dict):
            sentence_suggestions.append(
                Suggestion(
                    original=str(item.get("original", "")),
                    improved=str(item.get("improved", "")),
                    reason=str(item.get("reason", "")),
                )
            )

    if not sentence_suggestions:
        sentence_suggestions = [
            Suggestion(
                original="I very like English.",
                improved="I like English very much.",
                reason="使用更自然的英语表达。",
            )
        ]

    polished_essay = str(parsed.get("polished_essay", payload.essay)).strip() or payload.essay.strip()
    error_tags = normalize_error_tags([str(x) for x in parsed.get("error_tags", [])])
    training_suggestions = [str(x) for x in parsed.get("training_suggestions", [])][:4] or [
        "下次训练优先围绕高频错误标签做针对性改写练习。"
    ]

    return GradeResponse(
        submission_id=str(uuid4()),
        score=score,
        level=level,
        strengths=strengths,
        improvements=improvements,
        sentence_suggestions=sentence_suggestions,
        polished_essay=polished_essay,
        error_tags=error_tags,
        training_suggestions=training_suggestions,
        created_at=datetime.now(timezone.utc).isoformat(),
        engine="ai",
    )


def persist_record(payload: GradeRequest, response: GradeResponse) -> None:
    with get_conn() as conn:
        conn.execute(
            """
            INSERT INTO grading_records (
                submission_id, prompt, essay, student_name, score, level,
                strengths_json, improvements_json, sentence_suggestions_json,
                polished_essay, error_tags_json, training_suggestions_json,
                created_at, engine
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                response.submission_id,
                payload.prompt,
                payload.essay.strip(),
                payload.student_name,
                response.score,
                response.level,
                json.dumps(response.strengths, ensure_ascii=False),
                json.dumps(response.improvements, ensure_ascii=False),
                json.dumps([item.model_dump() for item in response.sentence_suggestions], ensure_ascii=False),
                response.polished_essay,
                json.dumps(response.error_tags, ensure_ascii=False),
                json.dumps(response.training_suggestions, ensure_ascii=False),
                response.created_at,
                response.engine,
            ),
        )


def row_to_history_item(row: sqlite3.Row) -> HistoryItem:
    return HistoryItem(
        submission_id=row["submission_id"],
        prompt=row["prompt"],
        essay=row["essay"],
        student_name=row["student_name"],
        score=row["score"],
        level=row["level"],
        strengths=json.loads(row["strengths_json"]),
        improvements=json.loads(row["improvements_json"]),
        sentence_suggestions=[Suggestion(**item) for item in json.loads(row["sentence_suggestions_json"])],
        polished_essay=row["polished_essay"],
        error_tags=json.loads(row["error_tags_json"] or "[]"),
        training_suggestions=json.loads(row["training_suggestions_json"] or "[]"),
        created_at=row["created_at"],
        engine=row["engine"],
    )


def build_student_report(student_name: str, records: List[HistoryItem]) -> StudentReport:
    total = len(records)
    average_score = round(sum(item.score for item in records) / total, 1)
    best_score = max(item.score for item in records)
    latest = records[0]
    score_trend = [item.score for item in reversed(records[:10])]

    tag_counts: dict[str, int] = {}
    for item in records:
        for tag in item.error_tags:
            tag_counts[tag] = tag_counts.get(tag, 0) + 1
    top_error_tags = [
        TagCount(tag=tag, count=count)
        for tag, count in sorted(tag_counts.items(), key=lambda x: (-x[1], x[0]))[:5]
    ]

    training_pool: List[str] = []
    for item in records[:5]:
        for tip in item.training_suggestions:
            if tip not in training_pool:
                training_pool.append(tip)
    recent_training_suggestions = training_pool[:5]

    top_tag_text = '、'.join(tag.tag for tag in top_error_tags[:3]) if top_error_tags else '表达'
    stage_summary = (
        f"{student_name} 最近共完成 {total} 次作文训练，平均分 {average_score} 分，"
        f"当前最新成绩为 {latest.score} 分（{latest.level}级）。"
        f"现阶段高频问题集中在：{top_tag_text}。"
    )

    next_stage_plan = recent_training_suggestions[:3] or [
        '围绕最近高频错误做专项纠错训练，并配合范文仿写。'
    ]

    coach_note = ''
    with get_conn() as conn:
        row = conn.execute("SELECT coach_note FROM student_notes WHERE student_name = ?", (student_name,)).fetchone()
        if row:
            coach_note = row['coach_note']

    return StudentReport(
        student_name=student_name,
        total_submissions=total,
        average_score=average_score,
        best_score=best_score,
        latest_score=latest.score,
        latest_level=latest.level,
        score_trend=score_trend,
        top_error_tags=top_error_tags,
        recent_training_suggestions=recent_training_suggestions,
        stage_summary=stage_summary,
        next_stage_plan=next_stage_plan,
        recent_records=records[:5],
        coach_note=coach_note,
    )



@app.post('/grade/image', response_model=GradeResponse)
async def grade_image_essay(
    prompt: str = Form(...),
    student_name: Optional[str] = Form(None),
    file: UploadFile = File(...)
):
    try:
        # Read image bytes and encode to base64
        image_bytes = await file.read()
        base64_image = base64.b64encode(image_bytes).decode('utf-8')
        mime_type = file.content_type or "image/jpeg"
        
        # Prepare the payload for the vision model
        student_display = student_name or "未提供"
        user_text = f"请批改这张图片中的手写英语作文，并严格返回 JSON：\n\n学生姓名：{student_display}\n作文题目：{prompt}"
        
        headers = {
            "Authorization": f"Bearer {ZENMUX_API_KEY}",
            "Content-Type": "application/json",
        }
        
        body = {
            "model": "openai/gpt-5.4", # Or "google/gemini-3.1-pro-preview" if required for vision
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": user_text},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:{mime_type};base64,{base64_image}"
                            }
                        }
                    ]
                }
            ],
            "temperature": 0.3,
            "response_format": {"type": "json_object"},
        }
        
        async with httpx.AsyncClient(timeout=90.0) as client:
            response = await client.post(f"{ZENMUX_BASE_URL}/chat/completions", headers=headers, json=body)
            response.raise_for_status()
            data = response.json()
            
        content_str = data["choices"][0]["message"]["content"]
        parsed = extract_json(content_str)
        
        # Logic to extract the original essay text the model saw (since it was in an image)
        # We will attempt to get it from the model, or use a placeholder
        extracted_essay = str(parsed.get("extracted_essay", "（系统从图片中识别的作文内容）")).strip()

        score = int(parsed.get("score", 10))
        score = max(1, min(score, 15))
        level = parsed.get("level") or normalize_level(score)
        
        strengths = [str(x) for x in parsed.get("strengths", [])][:4] or ["表达基本清晰。"]
        improvements = [str(x) for x in parsed.get("improvements", [])][:4] or ["建议进一步优化句式和连接词。"]
        
        sentence_suggestions_raw = parsed.get("sentence_suggestions", [])[:4]
        sentence_suggestions: List[Suggestion] = []
        for item in sentence_suggestions_raw:
            if isinstance(item, dict):
                sentence_suggestions.append(
                    Suggestion(
                        original=str(item.get("original", "")),
                        improved=str(item.get("improved", "")),
                        reason=str(item.get("reason", "")),
                    )
                )

        polished_essay = str(parsed.get("polished_essay", "")).strip()
        error_tags = normalize_error_tags([str(x) for x in parsed.get("error_tags", [])])
        training_suggestions = [str(x) for x in parsed.get("training_suggestions", [])][:4] or [
            "下次训练优先围绕高频错误标签做针对性改写练习。"
        ]

        grade_response = GradeResponse(
            submission_id=str(uuid4()),
            score=score,
            level=level,
            strengths=strengths,
            improvements=improvements,
            sentence_suggestions=sentence_suggestions,
            polished_essay=polished_essay,
            error_tags=error_tags,
            training_suggestions=training_suggestions,
            created_at=datetime.now(timezone.utc).isoformat(),
            engine="ai-vision",
        )
        
        # Save to DB (We use the placeholder text or ask the model to return the transcribed text)
        mock_payload = GradeRequest(prompt=prompt, essay=extracted_essay, student_name=student_name)
        persist_record(mock_payload, grade_response)
        
        return grade_response

    except Exception as e:
        print(f"Vision API error: {e}")
        # If image fails, return a 500 so frontend knows
        raise HTTPException(status_code=500, detail=f"图片解析与批改失败: {str(e)}")

@app.get('/')
def root():
    return {
        'message': 'ZK Writing Coach API is running',
        'docs': '/docs',
        'health': '/health',
        'history': '/history',
        'students': '/students',
        'database': str(DB_PATH),
        'model': DEFAULT_MODEL,
    }


@app.get('/health')
def health():
    return {
        'ok': True,
        'service': 'zk-writing-coach-api',
        'database': str(DB_PATH),
        'model': DEFAULT_MODEL,
    }


@app.get('/history', response_model=List[HistoryItem])
def get_history(limit: int = 20):
    safe_limit = max(1, min(limit, 100))
    with get_conn() as conn:
        rows = conn.execute(
            '''
            SELECT submission_id, prompt, essay, student_name, score, level,
                   strengths_json, improvements_json, sentence_suggestions_json,
                   polished_essay, error_tags_json, training_suggestions_json,
                   created_at, engine
            FROM grading_records
            ORDER BY datetime(created_at) DESC, id DESC
            LIMIT ?
            ''',
            (safe_limit,),
        ).fetchall()

    return [row_to_history_item(row) for row in rows]


@app.get('/students', response_model=List[StudentSummary])
def get_students():
    with get_conn() as conn:
        names = conn.execute(
            '''
            SELECT DISTINCT student_name
            FROM grading_records
            WHERE student_name IS NOT NULL AND TRIM(student_name) != ''
            ORDER BY student_name COLLATE NOCASE ASC
            '''
        ).fetchall()

        results: List[StudentSummary] = []
        for row in names:
            name = row['student_name']
            stats = conn.execute(
                '''
                SELECT score, level, created_at
                FROM grading_records
                WHERE student_name = ?
                ORDER BY datetime(created_at) DESC, id DESC
                ''',
                (name,),
            ).fetchall()
            if not stats:
                continue
            total_submissions = len(stats)
            average_score = round(sum(item['score'] for item in stats) / total_submissions, 1)
            latest = stats[0]
            results.append(
                StudentSummary(
                    student_name=name,
                    total_submissions=total_submissions,
                    average_score=average_score,
                    latest_score=latest['score'],
                    latest_level=latest['level'],
                    last_created_at=latest['created_at'],
                )
            )
        return results


@app.get('/students/{student_name}/report', response_model=StudentReport)
def get_student_report(student_name: str):
    decoded_name = unquote(student_name)
    with get_conn() as conn:
        rows = conn.execute(
            '''
            SELECT submission_id, prompt, essay, student_name, score, level,
                   strengths_json, improvements_json, sentence_suggestions_json,
                   polished_essay, error_tags_json, training_suggestions_json,
                   created_at, engine
            FROM grading_records
            WHERE student_name = ?
            ORDER BY datetime(created_at) DESC, id DESC
            ''',
            (decoded_name,),
        ).fetchall()

    records = [row_to_history_item(row) for row in rows]
    if not records:
        return StudentReport(
            student_name=decoded_name,
            total_submissions=0,
            average_score=0,
            best_score=0,
            latest_score=0,
            latest_level='-',
            score_trend=[],
            top_error_tags=[],
            recent_training_suggestions=[],
            stage_summary='暂无训练记录。',
            next_stage_plan=[],
            recent_records=[],
        )
    return build_student_report(decoded_name, records)


@app.get('/students/{student_name}/note')
def get_student_note(student_name: str):
    decoded_name = unquote(student_name)
    with get_conn() as conn:
        row = conn.execute("SELECT coach_note, updated_at FROM student_notes WHERE student_name = ?", (decoded_name,)).fetchone()
    if not row:
        return {'student_name': decoded_name, 'coach_note': '', 'updated_at': None}
    return {'student_name': decoded_name, 'coach_note': row['coach_note'], 'updated_at': row['updated_at']}


@app.put('/students/{student_name}/note')
def put_student_note(student_name: str, payload: StudentNotePayload):
    decoded_name = unquote(student_name)
    now = datetime.now(timezone.utc).isoformat()
    with get_conn() as conn:
        conn.execute(
            '''
            INSERT INTO student_notes (student_name, coach_note, updated_at)
            VALUES (?, ?, ?)
            ON CONFLICT(student_name) DO UPDATE SET
                coach_note = excluded.coach_note,
                updated_at = excluded.updated_at
            ''',
            (decoded_name, payload.coach_note, now),
        )
    return {'student_name': decoded_name, 'coach_note': payload.coach_note, 'updated_at': now}



@app.post('/upload/document')
async def upload_document(file: UploadFile = File(...)):
    filename = file.filename.lower()
    content_text = ""
    
    try:
        if filename.endswith('.txt'):
            content_bytes = await file.read()
            content_text = content_bytes.decode('utf-8')
            
        elif filename.endswith('.pdf'):
            content_bytes = await file.read()
            pdf_reader = PyPDF2.PdfReader(io.BytesIO(content_bytes))
            for page in pdf_reader.pages:
                text = page.extract_text()
                if text:
                    content_text += text + "\n"
                    
        elif filename.endswith('.docx'):
            content_bytes = await file.read()
            doc = docx.Document(io.BytesIO(content_bytes))
            for para in doc.paragraphs:
                content_text += para.text + "\n"
                
        else:
            raise HTTPException(status_code=400, detail="不支持的文件格式。目前仅支持 .txt, .pdf, .docx")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"文件解析失败: {str(e)}")
        
    return {"filename": file.filename, "extracted_text": content_text.strip()}


@app.post('/grade', response_model=GradeResponse)
async def grade_essay(payload: GradeRequest):
    try:
        response = await call_real_grader(payload)
    except Exception:
        response = fallback_grade(payload)

    persist_record(payload, response)
    return response
