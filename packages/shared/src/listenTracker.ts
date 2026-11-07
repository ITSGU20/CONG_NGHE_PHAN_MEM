import { LISTEN_VALID_SECONDS } from './constants';

/**
 * Cộng dồn thời gian phát thực tế của MỘT lần phát (BR-03).
 * Tạm dừng rồi nghe tiếp thì cộng dồn; đủ 10 giây thì báo đúng 1 lần.
 * Nghe lại từ đầu hoặc sang điểm khác => tạo tracker mới (hoặc gọi reset).
 */
export class ListenTracker {
  private seconds = 0;
  private fired = false;

  constructor(private onValid: (playedSeconds: number) => void) {}

  /** Gọi mỗi giây khi âm thanh đang phát */
  tick(delta = 1) {
    this.seconds += delta;
    if (!this.fired && this.seconds >= LISTEN_VALID_SECONDS) {
      this.fired = true;
      this.onValid(this.seconds);
    }
  }

  get played() {
    return this.seconds;
  }

  reset() {
    this.seconds = 0;
    this.fired = false;
  }
}
