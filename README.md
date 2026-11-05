# Hệ Thống Thi Trắc Nghiệm Trực Tuyến Chuẩn ELSE / BK-LMS

Hệ thống thi trắc nghiệm trực tuyến được thiết kế và mô phỏng giao diện chuẩn của hệ thống **ELSE (E-Learning System Environment) / Moodle / BK-LMS** tại các trường đại học (Đại học Bách Khoa, ĐHQG, SPKT,...).

---

## 🎯 Thông Tin Môn Học & Bộ Đề
- **Môn học:** Quản trị hệ thống (System Administration - Linux / CentOS)
- **Mã môn:** CO3013 / IT3010
- **Số lượng câu hỏi:** 50 câu trắc nghiệm (trích xuất toàn vẹn từ `DeThiThu.pdf`)
- **Đáp án & Giải thích:** Đầy đủ 50 câu kèm lời giải chuyên sâu từ giảng viên (`DA.txt`)
- **Hình ảnh đính kèm:** Đầy đủ các đoạn lệnh terminal, bảng `/etc/group`, `/etc/shadow`, `crontab`, `iptables`, `ifconfig`, `sudoers`, v.v.

---

## 🚀 Cách Chạy Ứng Dụng

Bạn có thể chạy ứng dụng theo 2 cách cực kỳ đơn giản:

### Cách 1: Mở Trực Tiếp (Khuyên Dùng - Nhanh Nhất)
- Nhấp đúp vào file **`start_quiz.bat`** (hoặc nhấp đúp trực tiếp vào file **`index.html`**).
- Ứng dụng hoạt động ngay trên mọi trình duyệt (Chrome, Edge, Firefox, Cốc Cốc, Safari,...) mà không cần cài đặt thêm phần mềm nào.

### Cách 2: Chạy Qua Local Server (HTTP)
- Nhấp đúp vào file **`start_server.bat`**.
- Trình duyệt sẽ tự động mở trang web tại địa chỉ: `http://localhost:8080/`.

---

## ✨ Các Tính Năng Nổi Bật Chuẩn ELSE / Moodle

1. **Giao Diện Chuẩn Đại Học (Moodle / BK-LMS)**:
   - Header nhận diện môn học, khoa đào tạo và thông tin sinh viên (có thể click để sửa tên và MSSV).
   - Thanh điều hướng Breadcrumbs chuẩn mực.
   - Thẻ câu hỏi chia 2 cột: Cột trái hiển thị số thứ tự câu hỏi, trạng thái ("Chưa trả lời" / "Đã trả lời"), thang điểm (0,20 / 1,00) và nút "Đặt cờ" (Flag) màu đỏ. Cột phải hiển thị nội dung câu hỏi, ảnh minh họa phóng to và danh sách các lựa chọn a, b, c, d hoặc Đúng / Sai.

2. **Bảng Điều Hướng Bài Kiểm Tra (Quiz Navigation)**:
   - Khối **Đồng hồ đếm ngược** (Countdown Timer) 50:00, tự động chuyển cảnh báo đỏ nhấp nháy khi còn dưới 5 phút.
   - Lưới **50 ô số câu hỏi**:
     - Nửa dưới màu xám/đen khi đã trả lời.
     - Góc trên gắn cờ đỏ khi được đánh dấu cần xem lại.
     - Viền xanh nổi bật chỉ câu hỏi đang xem trong tầm nhìn (Scroll Spy).
     - Nhấp vào bất kỳ số nào để cuộn mượt ngay đến câu hỏi đó.
   - Thanh tiến độ hoàn thành trực quan.

3. **Hai Chế Độ Làm Bài Linh Hoạt**:
   - **⏱️ Chế độ Thi tính giờ (Exam Mode)**: Bấm giờ nghiêm túc 50 phút, tổng hợp các câu chưa làm trước khi nộp, tự động nộp bài khi hết thời gian.
   - **📖 Chế độ Ôn thi (Study Mode)**: Cho phép nhấp nút "Kiểm tra đáp án" ngay tại mỗi câu để biết đúng/sai và đọc ngay giải thích chi tiết chuyên sâu.
   - **🔀 Đảo câu hỏi (Shuffle)**: Xáo trộn ngẫu nhiên thứ tự 50 câu hỏi để luyện phản xạ.

4. **Trang Tóm Tắt & Xem Lại Sau Khi Nộp (Review Page)**:
   - Bảng kết quả tổng quan: Điểm số trên thang 10,00 và phần trăm, thời gian làm bài, xếp loại (Xuất sắc, Giỏi, Khá, Đạt).
   - **Biểu đồ đánh giá năng lực theo 5 chủ đề**:
     1. Hệ thống tập tin & Ổ đĩa (`fstab`, `fdisk`, RAID, MBR, ZFS, NTFS)
     2. Người dùng, Nhóm & Phân quyền (`group`, `shadow`, `chage`, permissions, `sudo`, `umask`)
     3. Mạng máy tính & Giao thức (10Base-T, DHCP, DNS, IP/Subnet, Ethernet, `netstat`, TCP/IP)
     4. Bảo mật & Tường lửa (`iptables`, SSH, `secure` log, `sudoers`)
     5. Quản trị hệ điều hành & Tiến trình (Daemon, `crontab`, `killall`, Runlevel, `systemctl`, `rpm`)
   - Đánh dấu màu xanh cho đáp án đúng, màu đỏ cho đáp án sai.
   - Hiển thị **Hộp Giải thích chi tiết (Feedback)** phân tích tại sao đáp án đó đúng và tại sao các lựa chọn khác sai.
   - Bộ lọc tiện ích: "Chỉ xem các câu sai" để tập trung ôn lại phần còn yếu.

5. **Trải Nghiệm Hiện Đại**:
   - Tự động lưu tiến độ vào `localStorage` (không lo mất bài khi lỡ tải lại trang).
   - Hiệu ứng âm thanh thông minh (Web Audio API không cần tải file ngoài).
   - Chế độ Sáng / Tối (Light & Dark Mode).
   - Chế độ Toàn màn hình (Full Screen Focus).
   - Hỗ trợ in bảng điểm và bài giải ra giấy hoặc lưu PDF chuẩn đẹp (`Ctrl + P` hoặc nút In kết quả).

---

## 📁 Cấu Trúc Thư Mục
```
d:\TaiLieu\QTHT\
├── index.html              # Trang chủ ứng dụng web
├── start_quiz.bat          # File chạy nhanh ứng dụng
├── start_server.bat        # File chạy máy chủ web local
├── README.md               # Tài liệu hướng dẫn
├── DA.txt                  # Đáp án gốc từ giảng viên
├── DeThiThu.pdf            # Đề thi gốc dạng PDF
├── quiz-data.json          # Dữ liệu 50 câu hỏi chuẩn JSON
├── assets\
│   ├── css\
│   │   └── style.css       # Toàn bộ giao diện chuẩn ELSE / Moodle
│   ├── js\
│   │   ├── quiz-data.js    # Dataset 50 câu tích hợp ảnh Base64
│   │   └── app.js          # Logic tính điểm, timer, âm thanh, điều hướng
│   └── images\             # Thư mục hình ảnh trích xuất từ đề thi
```
