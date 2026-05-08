# Testing Guide — Micro-Surgery Steps 5 & 6

## Step 5: ทดสอบ Simulated Fetch Calls

### เปิด server ก่อน
```powershell
npm start
```

---

### Test A — Identity Service verify endpoint
```powershell
# ควรได้ 401 (no token)
Invoke-RestMethod -Uri "http://localhost:3000/api/auth/verify" -Method Get

# ล็อกอินก่อนเพื่อได้ token
$login = Invoke-RestMethod -Uri "http://localhost:3000/api/login" `
  -Method Post -ContentType "application/json" `
  -Body '{"email":"somchai.k@fior.shop","password":"Flower@2024"}'

$token = $login.token

# ทดสอบ verify ด้วย token จริง — ควรได้ { userId, firstName }
Invoke-RestMethod -Uri "http://localhost:3000/api/auth/verify" `
  -Method Get -Headers @{ Authorization = "Bearer $token" }
```

**Expected:**
```json
{ "userId": 1, "firstName": "Somchai" }
```

---

### Test B — Checkout พร้อม token (user_id ถูกต้อง)
```powershell
$body = @{
  customerName = "Somchai K"
  email        = "somchai.k@fior.shop"
  phone        = "0812345678"
  address      = "Bangkok"
  creditCard   = "4242424242424242"
  _authToken   = $token
  items = @(
    @{ productId = 1; productName = "Rose"; price = 1290; quantity = 2 }
  )
} | ConvertTo-Json -Depth 3

Invoke-RestMethod -Uri "http://localhost:3000/api/checkout" `
  -Method Post -ContentType "application/json" -Body $body
```

**Expected:** `200 { orderId, total }` และ `user_id` ใน `store.db` ตรงกับ userId จริง

---

### Test C — Checkout แบบ guest (ไม่มี token)
เหมือน Test B แต่เอา `_authToken` ออก

**Expected:** `200 { orderId, total }` และ `user_id = NULL` ใน store.db

---

### Test D — Catalog Service fallback (price จาก catalog ถูกต้อง)
```powershell
# ส่ง price ผิดจากฝั่ง browser — catalog จะ override ให้
$body = @{
  customerName = "Test"
  email        = "test@test.com"
  phone        = "0000000000"
  address      = "Test"
  creditCard   = "1234567890123456"
  items = @(
    @{ productId = 1; productName = "Fake Name"; price = 1; quantity = 1 }
  )
} | ConvertTo-Json -Depth 3

Invoke-RestMethod -Uri "http://localhost:3000/api/checkout" `
  -Method Post -ContentType "application/json" -Body $body
```

**Expected:** `total` ในผลลัพธ์ = ราคาจริงจาก Catalog (1290) ไม่ใช่ราคาที่ส่งมา (1)

---

## Step 6: "Shut Down" Auth Service — Critical Thinking Test

### วิธีจำลอง Auth service down

เปิด `Backend/server.js` แล้ว comment บรรทัด:

```js
// app.use("/api/login", authRouter);
// app.use("/api/auth", authRouter);
// app.use("/api/register", registerRouter);
```

รีสตาร์ต server แล้วทดสอบ:

---

### Test 1 — Guest ยังดูสินค้าได้ไหม?
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/products"
```

**Expected (ถ้า decoupled พอ):** ✅ ได้รายการสินค้าปกติ
**ถ้าพัง:** ❌ แปลว่า ProductService ยังผูกกับ AuthService อยู่

**คำตอบสำหรับโปรเจกต์นี้:** `GET /api/products` ไม่ผ่าน auth middleware เลย
→ Guest **ยังดูสินค้าได้** แม้ auth route จะถูก comment ออก ✅

---

### Test 2 — Checkout ยังทำงานได้ไหม?
```powershell
$body = @{
  customerName = "Guest"
  email        = "guest@test.com"
  phone        = "0000000000"
  address      = "Test"
  creditCard   = "1234567890123456"
  items = @(@{ productId = 1; productName = "Rose"; price = 1290; quantity = 1 })
} | ConvertTo-Json -Depth 3

Invoke-RestMethod -Uri "http://localhost:3000/api/checkout" `
  -Method Post -ContentType "application/json" -Body $body
```

**Expected:** ✅ Checkout สำเร็จ (user_id = NULL เพราะ Identity down → graceful degradation)

---

### Test 3 — Login/Register ล้มเหลวตามที่คาด
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/login" `
  -Method Post -ContentType "application/json" `
  -Body '{"email":"x@x.com","password":"123456"}'
```

**Expected:** 404 หรือ Cannot POST (route ถูก comment) — ถูกต้องตามที่ "ปิดบริการ"

---

## สรุป Critical Thinking

| Question | Answer |
|---|---|
| Auth down → Guest เห็นสินค้าได้ไหม? | ✅ ได้ — ProductService ไม่ depend on AuthService |
| Auth down → Checkout ทำงานได้ไหม? | ✅ ได้ — ใช้ graceful degradation (userId = null) |
| Auth down → Login ทำงานได้ไหม? | ❌ ไม่ได้ — ถูก comment ออก (ตามที่ตั้งใจ) |
| Services decoupled พอไหม? | ✅ ใช่ — Catalog และ Orders ทำงานอิสระจาก Identity |

**Key Design:** `verifyTokenFromIdentityService()` ใช้ `try/catch` คืน `null` เมื่อ Identity down
→ OrderService ยังบันทึก order ได้ในฐานะ guest แทนที่จะพังทั้งระบบ
