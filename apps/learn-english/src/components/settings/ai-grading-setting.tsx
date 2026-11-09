"use client";

import { useState, useSyncExternalStore, type FormEvent } from "react";
import { ArrowDown, ArrowUp, Eye, EyeOff, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { checkAiKey } from "@/ai-grading/gemini-client";
import { MAX_AI_KEYS, maskKey, statusAt, type AiKey, type AiKeyStatus } from "@/learning/exercises/translate-ai";
import {
  addAiKey,
  addKeyError,
  getAiKeys,
  getServerAiKeys,
  isAiKeyStorageBlocked,
  moveAiKey,
  removeAiKey,
  subscribeAiKeys,
  type AddKeyError,
} from "@/lib/ai-keys";

// "Chấm điểm bằng AI" in Cài đặt (feature 033): the learner's own Google AI
// Studio keys, kept on this device only and tried in order.

const KEY_URL = "https://aistudio.google.com/apikey";
const INPUT_ID = "ai-key-input";

const ADD_ERRORS: Record<AddKeyError | "invalid" | "offline", string> = {
  empty: "Bạn dán khóa vào ô trước nhé.",
  duplicate: "Khóa này đã có trong danh sách.",
  full: `Bạn chỉ thêm được tối đa ${MAX_AI_KEYS} khóa.`,
  invalid: "Google không nhận khóa này. Bạn kiểm tra lại khóa trong Google AI Studio nhé.",
  offline: "Chưa kiểm tra được khóa (có thể bạn đang mất mạng), nên khóa chưa được lưu. Bạn thử lại sau nhé.",
};

const STATUS_LABELS: Record<AiKeyStatus, string> = {
  working: "Đang dùng được",
  quota: "Hết lượt hôm nay",
  invalid: "Không hợp lệ",
};

const STATUS_VARIANTS = { working: "secondary", quota: "outline", invalid: "destructive" } as const satisfies Record<AiKeyStatus, string>;

const serverBlocked = () => false;

function AddKeyForm({ count }: { count: number }) {
  const [value, setValue] = useState("");
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [added, setAdded] = useState(false);
  const errorId = `${INPUT_ID}-error`;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setAdded(false);
    const invalid = addKeyError(value);
    if (invalid) {
      setError(ADD_ERRORS[invalid]);
      return;
    }
    setError(null);
    setChecking(true);
    const check = await checkAiKey(value);
    setChecking(false);
    if (!check.ok) {
      setError(check.reason === "invalid" ? check.reasonVi : ADD_ERRORS.offline);
      return;
    }
    addAiKey(value);
    setValue("");
    setAdded(true);
  }

  function handleChange(next: string) {
    setValue(next);
    setAdded(false);
    if (error) setError(null);
  }

  return (
    <form className="grid gap-2" onSubmit={handleSubmit} noValidate>
      <Label htmlFor={INPUT_ID}>Thêm khóa API</Label>
      <div className="flex flex-wrap gap-2">
        <div className="relative w-full max-w-sm">
          <Input
            id={INPUT_ID}
            type={visible ? "text" : "password"}
            value={value}
            onChange={(event) => handleChange(event.target.value)}
            placeholder="Dán khóa từ Google AI Studio"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            disabled={count >= MAX_AI_KEYS}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            className="h-11 pr-12"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon-lg"
            className="absolute top-0 right-0"
            onClick={() => setVisible((current) => !current)}
            aria-label={visible ? "Ẩn khóa" : "Hiện khóa"}
            aria-pressed={visible}
          >
            {visible ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
          </Button>
        </div>
        <Button type="submit" size="lg" className="h-11 px-5" disabled={checking || count >= MAX_AI_KEYS}>
          {checking ? "Đang kiểm tra…" : "Thêm khóa"}
        </Button>
      </div>
      <div aria-live="polite">
        {error ? (
          <p id={errorId} className="text-sm text-destructive">
            {error}
          </p>
        ) : added ? (
          <p className="text-sm text-success">Đã thêm khóa. Từ giờ câu dịch của bạn sẽ được chấm bằng AI.</p>
        ) : null}
      </div>
    </form>
  );
}

function KeyRow({ aiKey, index, count, now }: { aiKey: AiKey; index: number; count: number; now: number }) {
  const status = statusAt(aiKey, now);
  const label = `Khóa ${index + 1} (${maskKey(aiKey.key)})`;
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border p-3">
      <div className="grid min-w-0 flex-1 gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">Khóa {index + 1}</span>
          <span className="font-mono text-sm text-muted-foreground">{maskKey(aiKey.key)}</span>
          <Badge variant={STATUS_VARIANTS[status]}>{STATUS_LABELS[status]}</Badge>
        </div>
        {status === "invalid" && aiKey.reasonVi ? <p className="text-sm text-muted-foreground">{aiKey.reasonVi}</p> : null}
      </div>
      <div className="flex gap-1">
        <Button type="button" variant="ghost" size="icon-lg" onClick={() => moveAiKey(aiKey.id, -1)} disabled={index === 0} aria-label={`Đưa ${label} lên trước`}>
          <ArrowUp aria-hidden />
        </Button>
        <Button type="button" variant="ghost" size="icon-lg" onClick={() => moveAiKey(aiKey.id, 1)} disabled={index === count - 1} aria-label={`Đưa ${label} xuống sau`}>
          <ArrowDown aria-hidden />
        </Button>
        <Button type="button" variant="ghost" size="icon-lg" onClick={() => removeAiKey(aiKey.id)} aria-label={`Xóa ${label}`}>
          <Trash2 aria-hidden />
        </Button>
      </div>
    </li>
  );
}

/** The learner's Google AI Studio keys for grading "Dịch câu" (feature 033, AC-001 to AC-006). */
export function AiGradingSetting() {
  const keys = useSyncExternalStore(subscribeAiKeys, getAiKeys, getServerAiKeys);
  const blocked = useSyncExternalStore(subscribeAiKeys, isAiKeyStorageBlocked, serverBlocked);
  // Read once when the card opens: a quota reset passing while it is open shows on the next visit.
  const [now] = useState(Date.now);

  return (
    <div className="grid gap-5">
      <div className="grid gap-2 text-sm text-muted-foreground">
        <p>
          Bài &ldquo;Dịch câu&rdquo; thường chỉ chấm đúng khi câu của bạn giống đáp án. Thêm khóa API miễn phí của Google AI Studio để AI chấm câu của bạn theo nghĩa: viết khác mà đúng vẫn được tính là đúng, viết sai thì AI giải thích chỗ sai. Với &ldquo;Bài viết&rdquo;, AI nhận xét ngữ pháp, từ vựng, ý nghĩa và sửa bài cho bạn.
        </p>
        <p>
          Khóa chỉ lưu trên thiết bị này, không gửi lên máy chủ của ứng dụng và không có trong bản sao lưu hay mã đồng bộ. Khi bạn đăng xuất, khóa cũng bị xóa. Mỗi lần chấm, đề bài tiếng Việt và bài bạn viết được gửi thẳng tới Google.
        </p>
        <p>
          Ở gói miễn phí, Google có thể dùng và cho người đọc nội dung được gửi để cải thiện sản phẩm, nên đừng viết thông tin cá nhân vào bài. Google yêu cầu người dùng khóa từ 18 tuổi trở lên và không mở gói miễn phí ở Liên minh châu Âu, Anh và Thụy Sĩ.
        </p>
        <p>
          Bạn có thể thêm tối đa {MAX_AI_KEYS} khóa. Ứng dụng dùng khóa 1 trước, hết lượt thì tự chuyển sang khóa tiếp theo. Mỗi khóa nên tạo từ một tài khoản Google khác, vì các khóa cùng một tài khoản dùng chung lượt.{" "}
          <a href={KEY_URL} target="_blank" rel="noreferrer" className="text-link underline underline-offset-4">
            Tạo khóa miễn phí
          </a>
        </p>
      </div>

      {keys.length ? (
        <ol className="grid gap-2" aria-label="Khóa API, theo thứ tự dùng">
          {keys.map((aiKey, index) => (
            <KeyRow key={aiKey.id} aiKey={aiKey} index={index} count={keys.length} now={now} />
          ))}
        </ol>
      ) : (
        <p className="text-sm">Bạn chưa thêm khóa nào, nên câu dịch được so với đáp án như bình thường.</p>
      )}

      <AddKeyForm count={keys.length} />

      {blocked ? <p className="text-sm text-muted-foreground">Trình duyệt đang chặn lưu dữ liệu, nên khóa chỉ được giữ đến khi bạn đóng thẻ này.</p> : null}
    </div>
  );
}
