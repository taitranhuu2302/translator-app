# Hướng dẫn build NextG Translate

Tài liệu này mô tả cách **cài đặt môi trường**, **chạy dev**, và **đóng gói** ứng dụng desktop (Electron Forge + Vite).

---

## Yêu cầu

| Công cụ | Phiên bản gợi ý |
|--------|------------------|
| Node.js | ≥ 18 |
| npm | ≥ 9 |

Cài dependency:

```bash
npm install
```

---

## Chạy khi phát triển (không build installer)

```bash
npm start
```

Lệnh này chạy `electron-forge start`: build tạm main/preload/renderer, bật Electron với Vite HMR. Dùng khi sửa code.

---

## Kiểm tra trước khi đóng gói (khuyến nghị)

```bash
npm run typecheck
npm run lint
npm test
```

---

## Build đóng gói (Electron Forge)

Dự án dùng **@electron-forge/plugin-vite** để bundle `src/main.ts`, `src/preload.ts`, và hai renderer (`main_window`, `quick_window`). Cấu hình nằm trong `forge.config.ts`.

### 1. `package` — chỉ đóng gói app (thư mục chạy được)

Tạo bản **chưa** làm installer, thường dùng để kiểm tra nhanh:

```bash
npm run package
```

Kết quả: thư mục app trong `out/` (tên thư mục phụ thuộc Forge; thường dạng `out/nextg-translate-darwin-arm64/` hoặc tương tự theo platform).

### 2. `make` — tạo bản cài / nén theo nền tảng

Tạo **artifact** (ZIP, Squirrel, deb, rpm, …) theo **makers** trong `forge.config.ts`:

| Maker | Nền tảng | Đầu ra điển hình |
|-------|-----------|-------------------|
| `MakerZIP` | macOS (`darwin`) | File `.zip` |
| `MakerSquirrel` | Windows (`win32`) | Installer Squirrel |
| `MakerDeb` | Linux | `.deb` |
| `MakerRpm` | Linux | `.rpm` |

**Build trên chính máy bạn (theo OS hiện tại):**

```bash
npm run make
```

**Chỉ định platform** (cần môi trường build phù hợp; trên macOS thường chỉ build được `darwin` trừ khi cấu hình cross-compile):

```bash
# macOS — ZIP
npm run make -- --platform=darwin

# Windows — Squirrel (chạy trên máy Windows hoặc CI Windows)
npm run make -- --platform=win32

# Linux — deb/rpm
npm run make -- --platform=linux
```

**Thư mục output:** `out/make/` (và có thể có `out/` cho bước package trung gian).

### Build macOS có quyền hệ thống

Để bản build macOS hiển thị prompt quyền đúng cách cho Automation / Microphone, dự án đã cấu hình:

- `appBundleId` cố định trong `forge.config.ts`
- `extendInfo` với:
  - `NSAppleEventsUsageDescription`
  - `NSMicrophoneUsageDescription`
- `osxSign.hardenedRuntime = true`
- entitlement Apple Events trong `entitlements.plist`

#### Biến môi trường notarization

Nếu muốn **sign + notarize** bản macOS, set các biến môi trường sau trên máy Mac:

```bash
export APPLE_ID="your-apple-id@example.com"
export APPLE_APP_SPECIFIC_PASSWORD="xxxx-xxxx-xxxx-xxxx"
export APPLE_TEAM_ID="YOURTEAMID"
```

Sau đó chạy:

```bash
npm run make -- --platform=darwin
```

Nếu **không** set 3 biến trên, Forge vẫn dùng cấu hình signing/Info.plist/entitlements, nhưng sẽ bỏ qua bước notarization.

#### Người dùng vẫn phải cấp quyền thủ công

Lưu ý: macOS **không cho phép** app tự cấp sẵn quyền `Accessibility` hoặc `Automation` khi cài đặt. App chỉ có thể:

- kích hoạt prompt hệ thống,
- hướng dẫn người dùng,
- mở đúng trang trong `System Settings > Privacy & Security`.

Người dùng vẫn cần tự bật quyền cho app trong:

- `Accessibility`
- `Automation`

Microphone sẽ hiện prompt chuẩn của macOS khi tính năng liên quan được dùng.

### 3. `publish` — đẩy bản release (tùy cấu hình)

```bash
npm run publish
```

Chỉ dùng khi đã cấu hình publisher trong Forge (token, bucket, v.v.). Mặc định có thể chưa dùng được nếu chưa setup.

### Release để auto-update hoạt động

Để auto-update nhìn thấy version mới:

1. tăng `version` trong `package.json` (ví dụ `1.0.0` -> `1.0.1`)
2. chạy:

```bash
npm run publish
```

hoặc:

```bash
electron-forge publish
```

Lưu ý:

- `update-electron-app` + `update.electronjs.org` yêu cầu **GitHub Releases public**
- release phải là **published release**, không phải `draft`
- release không được đánh dấu `prerelease`

Nếu repo/release là private, cần chuyển sang:

- custom update feed/static storage, hoặc
- `electron-updater` / giải pháp khác

---

## Thông tin từ `forge.config.ts`

- **Tên app đóng gói:** `NextGTranslate` (packager `name`), executable `nextg-translate`.
- **ASAR:** bật (`asar: true`).
- **Hai cửa sổ renderer:** `main_window` (`index.html`), `quick_window` (`index-quick.html`).

---

## Gặp lỗi khi build

1. **Lỗi TypeScript / ESLint:** chạy `npm run typecheck` và `npm run lint`.
2. **Thiếu dependency native:** Forge có `@electron-forge/plugin-auto-unpack-natives` trong repo — nếu thêm package có binary, đọc log `make` để xử lý.
3. **Build Windows trên macOS:** Squirrel thường cần build trên Windows hoặc CI tương ứng; không ép được dễ dàng như ZIP đơn giản.

---

## Tóm tắt lệnh

| Mục đích | Lệnh |
|----------|------|
| Dev có HMR | `npm start` |
| Chỉ package (folder chạy được) | `npm run package` |
| Tạo installer / ZIP / deb / rpm | `npm run make` |

Chi tiết tính năng app và quyền hệ thống (Accessibility, v.v.) xem [README.md](./README.md).
