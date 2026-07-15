# Campus AI Teaching Demo Design

## Purpose

Build a first runnable demo for China Mobile's university AI outreach exercise. The demo should support a live product-style walkthrough for university leaders, information-center staff, and teaching administrators.

The first scenario is a teaching AI application: a teacher enters course, class, lesson, student profile, and teaching constraints, then uses DeepSeek Flash to generate a practical teaching package.

## Demo Name

智教方案生成台

## Target Scenario

高校教师 preparing a 45-minute class needs a complete, editable teaching plan quickly. The information-center buyer needs to see that China Mobile can connect AI capability to real campus workflows, not only generic chat.

The demo flow follows the project description:

1. 需求输入: course, topic, class profile, student pain points, teaching objectives, and output preferences.
2. AI 智能处理: backend calls the official DeepSeek API using the `api_key` value in `.env`.
3. 成果输出: frontend renders a structured teaching plan, PPT outline, quiz, and learning-risk analysis.

## User Experience

The app opens directly to the working demo, not a marketing landing page.

The screen has two main areas:

1. Input panel: a compact form with prefilled university teaching demo values, editable by the presenter.
2. Output workspace: tabs for 教案, 课件大纲, 随堂测验, 学情分析, and 演示话术.

The primary action is one button: 生成智教方案. While running, the UI shows progress and disables duplicate requests. On success, each tab displays polished Chinese business-demo content. On failure, the UI shows a clear error and can load local sample output so the presenter can keep the demo moving.

## Architecture

Use a small JavaScript web app:

1. Browser frontend for the demo UI.
2. Zero-dependency Node.js backend API route for DeepSeek calls, so the demo runs without downloading packages in restricted environments.
3. `.env` remains server-only and is never exposed to browser code.
4. A shared prompt builder turns form data into a campus-teaching-specific DeepSeek request.

Expected file structure:

```text
package.json
src/
  server.js
  deepseekClient.js
  promptBuilder.js
  sampleResult.js
public/
  index.html
  styles.css
  app.js
docs/
  demo-script.md
```

## DeepSeek Integration

The backend reads:

1. `api_key`
2. optional `deepseek_base_url`

The client uses DeepSeek's official OpenAI-compatible base URL `https://api.deepseek.com` and `POST /chat/completions`.

The model is fixed to `deepseek-v4-flash`; environment variables must not override it.

## Output Contract

DeepSeek should be prompted to return JSON with these fields:

1. `teachingPlan`: lesson objectives, key points, class flow, teacher actions, student actions, assessment.
2. `slideOutline`: 6 to 8 slide titles with speaker notes.
3. `quiz`: five mixed question items with answers and explanations.
4. `learningAnalysis`: common misconceptions, risk groups, intervention suggestions, and data indicators.
5. `pitchScript`: short现场演示话术 for campus sales.

If the model returns non-JSON text, the backend will preserve the raw answer and the UI will show it in a fallback result tab.

## Error Handling

The backend must return safe error messages without leaking API keys.

Frontend states:

1. Ready: form can be edited and submitted.
2. Loading: request in progress, duplicate submit disabled; full DeepSeek generation may take 30 to 60 seconds.
3. Success: tabs render structured output.
4. Error: show concise failure reason and offer a local sample result button.

## Testing And Verification

Because this is the first demo, tests should cover the parts most likely to break during iteration:

1. Prompt builder includes campus teaching context and all required user inputs.
2. DeepSeek client builds the request without exposing secrets.
3. API can return sample output when requested.
4. Frontend can render all expected result tabs.

Manual verification:

1. Start the local server.
2. Open the demo URL.
3. Generate a result with DeepSeek using `.env`.
4. Confirm loading, success, error, and sample fallback states are usable.

## Non-Goals

This first demo will not include authentication, persistent storage, account management, real student data upload, or production deployment. It is a local presentation demo intended for iteration after user feedback.
