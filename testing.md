| Mục đích | Ý nghĩa |
| ----------- | ----------- |
| Đơn giản hóa quá trình đầu tư<br>và theo dõi đầu tư trên BRicher | Trở thành công cụ hữu hiệu hơn cho nhà đầu tư<br>thay vì chỉ mang tính tham khảo, loại bỏ dào<br>cản công nghệ và kiến thức khi người dùng sử dụng app |
|||

| DS đầu vào  | Mô tả | Ngoại lệ |
| ----------- | ----------- | ----------- |
| *Chiến lược* | Chọn chiến lược trên giao diện qua "Strategy Exploring" | Định danh bằng id dưới dạng 64 ký tự Hexa |
| *Amount* | Số lượng tiền muốn đầu tư<br>(tới 9 dấu phẩy động, tối thiểu lượng token tương đương 1 USD) | Phải nhỏ hơn số lượng sở hữu (và trừ đi cả phí các giao dịch nếu là đồng native - bnb) |
| *Slippage percents* | Thay đổi mức % trượt giá mặc định | Chỉ cần điền khi người dùng không thể thực hiện được giao dịch |
| *Custom amount* | Chưa sử dụng |  |
||||

| Yêu cầu | Chi tiết | Ngoại lệ |
| ----------- | ----------- | ----------- |
| 1A | Tất cả các chiến lược đều có semi-auto invest |  |
| 1B | Tất cả tokens hoặc tiền sinh ra đều thuộc về người dùng khi thực hiện xong semi-auto invest |  |
| 1C | Sau khi thực hiện 1 bước trở lên thì toàn bộ số tiền người dùng nhập sẽ được sử dụng (ví bị trừ) |  |
| 2A | Một số chiến dịch có lending dạng Compound-fork sẽ không có auto invest | Những lending này nếu chỉ deposit thì vẫn auto được |
| 2B | Các transactions từ số 2 trở đi trong semi-auto invest chỉ được phép chạy khi transaction phía trước thành công  | Nếu có approve thì approve phải thành công mới được Execute ở auto invest |
| 3A | Mỗi transaction tốn tối đa 30s để chạy, toàn bộ chiến lược chỉ được chạy trong vòng 1 tiếng nếu không bị hủy vô điều kiện | Các transactions có thể được reload nếu cần thiết |
||||

| Đầu ra của | Mô tả |
| ----------- | ----------- |
| *Semi-auto invest calls* | Trả lại nhiều transactions và chi tiết của phép gọi đó<br>để người dùng dễ dàng click-and-wait lần lượt, tối thiểu 1 transaction cho 1 `step` của chiến lược, tối đa là 30 |
| *Auto invest calls* | Trả lại 1 hoặc 2 giao dịch `Approve` mà người dùng cần thực hiện trước khi thực hiện 1 giao dịch duy nhất tới contract Aggregator |
| *Transactions* | Mỗi khi "Execute" sẽ nhận được Error hoặc trạng thái giao dịch tương ứng |
| *Error dialogs* | Hộp thoại báo lỗi với tiêu đề, chi tiết, lý do lỗi, thứ tự của transaction trong steps bị lỗi, gợi ý hành động xử lý |
|||

| Tài nguyên test | Giá trị |
| ----------- | ----------- |
| BNB | 0.05 ($15) |
| USDT | 5 ($5) |
| BUSD | 5 ($5) |
| TRAVA | 5000 ($2.3) |

Có một trong những app này trong steps thì không thể auto-invest
| Apps | Autoinvest |
| ----------- | ----------- |
| Cream, Venus (**chỉ khi borrow**) | No |
| Pancake farming vault | No |
| Alpaca Governance vault | No |
| Pancake Syrup vault | No |
