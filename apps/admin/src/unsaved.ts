/** UI-07: trang chỉnh sửa báo "có thay đổi chưa lưu" để mọi liên kết rời trang đều hỏi xác nhận trước. */
let dirty = false;
export const setUnsaved = (v: boolean) => {
  dirty = v;
};
/** true = được phép rời trang */
export const confirmLeave = () => !dirty || window.confirm('Có thay đổi chưa lưu. Rời trang và bỏ các thay đổi này?');
