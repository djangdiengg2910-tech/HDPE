# Birthday Generator

Birthday Generator là MVP chạy local để người gửi tạo một file HTML chúc mừng sinh nhật tự chứa. Người nhận chỉ cần mở file trong trình duyệt để trải nghiệm; chưa có deploy ở giai đoạn này.

## Chạy local

- Cần Node.js `>=22.13.0`.
- Chạy `npm run dev` để mở Generator và Wish API local cùng lúc.
- Generator chạy theo URL được terminal in ra.
- Wish API chỉ bind tại `127.0.0.1:8787`; kiểm tra bằng `http://127.0.0.1:8787/health`.

## Telegram local (chưa bật gửi ở Phase 0)

1. Copy `wish-api/.env.local.example` thành `wish-api/.env.local` khi chuẩn bị tích hợp Telegram.
2. Điền bot token thật **chỉ** vào file `.env.local` ở máy local.
3. Copy `wish-api/gifts.local.json.example` thành `wish-api/gifts.local.json` khi có gift mapping.

Hai file local trên bị Git ignore. Bot token và `chatId` tuyệt đối không được đưa vào HTML quà hoặc commit vào repo.

## Cấu trúc chính

- `app/`: Generator UI.
- `birthday-template/`: runtime của file HTML quà tự chứa.
- `wish-api/`: API local dành cho Scene điều ước.
- `shared/`: schema và logic dùng chung.
- `scripts/dev.mjs`: chạy Generator và Wish API trong một lệnh.
- `outputs/`: nơi lưu file quà sinh ra khi test, không commit.

## Đóng gói template (Phase 2)

`prototype.html` có một khối JSON duy nhất cho dữ liệu người nhận. Có thể đóng
gói fixture hoặc JSON từ Generator thành HTML tự chứa bằng lệnh sau:

```powershell
node scripts/render-birthday-html.mjs tests/fixtures/birthday-short.json outputs/HappyBirthday_LeAn.html
```

Schema, fallback, serializer chống `</script>`/XSS và hai fixture kiểm thử nằm
trong `shared/` và `tests/fixtures/`.

## Kiểm tra

- `npm run build`: kiểm tra Generator có build được.
- `npm test`: chạy test hiện có.

Chi tiết mốc triển khai, scene và skill nằm trong `PLAN.md`.
