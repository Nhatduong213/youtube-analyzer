import Link from "next/link";
import { ShieldCheck, ArrowLeft, Lock, FileText, HelpCircle, EyeOff } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground py-12 px-4 sm:px-6 lg:px-8">
      {/* Decorative ambient orbs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-violet-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Navigation */}
        <div className="mb-8">
          <Link
            href="/login"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors group"
          >
            <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
            Back to Sign In / Quay lại Đăng nhập
          </Link>
        </div>

        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex p-3 rounded-2xl bg-primary/10 border border-primary/20 mb-4">
            <ShieldCheck className="h-10 w-10 text-primary animate-pulse" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2">Privacy Policy</h1>
          <p className="text-lg text-muted-foreground">Chính sách bảo mật thông tin người dùng</p>
        </div>

        {/* Content Box */}
        <div className="glass-card border border-white/10 rounded-3xl p-8 md:p-12 space-y-10 shadow-2xl backdrop-blur-xl bg-slate-900/40">
          
          {/* Section 1: EN */}
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-white flex items-center border-b border-white/10 pb-2">
              <FileText className="mr-3 h-6 w-6 text-primary" /> English Version
            </h2>
            
            <div className="space-y-4 text-muted-foreground leading-relaxed text-sm">
              <p>
                <strong>Last Updated: May 27, 2026</strong>
              </p>
              <p>
                Welcome to <strong>YouTube BA Analyzer</strong>. We are committed to protecting your privacy and ensuring you have a secure experience on our platform.
              </p>
              
              <h3 className="text-white font-medium mt-4">1. YouTube API Services</h3>
              <p>
                Our application uses <strong>YouTube API Services</strong> to fetch data related to YouTube channels and videos (such as view counts, subscriber counts, titles, descriptions, and video snapshots).
              </p>
              <p>
                By using this application, you acknowledge and agree to be bound by the{" "}
                <a
                  href="https://www.youtube.com/t/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline font-semibold"
                >
                  YouTube Terms of Service
                </a>
                .
              </p>

              <h3 className="text-white font-medium mt-4">2. Google Privacy Policy</h3>
              <p>
                We do not collect or store your Google account credentials or personal information other than the API keys you optionally configure in the Settings panel. 
                Please refer to the{" "}
                <a
                  href="https://policies.google.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline font-semibold"
                >
                  Google Privacy Policy
                </a>{" "}
                to understand how Google handles your personal data.
              </p>

              <h3 className="text-white font-medium mt-4">3. Data Usage & Storage</h3>
              <p>
                The YouTube channel analytics data fetched via our application is used solely for the purpose of compiling analytical dashboards and charts (such as Views Per Hour trends). This data is stored locally in your analytical database.
              </p>

              <h3 className="text-white font-medium mt-4">4. Revoking Access</h3>
              <p>
                You can revoke this application's access to your YouTube public data or API authorization at any time via the{" "}
                <a
                  href="https://security.google.com/settings/security/permissions"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline font-semibold"
                >
                  Google Security Settings
                </a>{" "}
                page. Alternatively, you can delete your configured YouTube API Keys inside your Settings page within the app.
              </p>

              <h3 className="text-white font-medium mt-4">5. Cookie Policy</h3>
              <p>
                We use strictly necessary cookies to authenticate your account and persist session states. These cookies are essential for the security and basic functionality of the application and do not track your browsing activity on other websites.
              </p>
            </div>
          </section>

          {/* Section 2: VI */}
          <section className="space-y-4 pt-6 border-t border-white/5">
            <h2 className="text-2xl font-semibold text-white flex items-center border-b border-white/10 pb-2">
              <ShieldCheck className="mr-3 h-6 w-6 text-primary" /> Tiếng Việt (Vietnamese)
            </h2>
            
            <div className="space-y-4 text-muted-foreground leading-relaxed text-sm">
              <p>
                <strong>Cập nhật lần cuối: Ngày 27 tháng 5, 2026</strong>
              </p>
              <p>
                Chào mừng bạn đến với <strong>YouTube BA Analyzer</strong>. Chúng tôi cam kết bảo vệ quyền riêng tư và cung cấp cho bạn một trải nghiệm an toàn nhất trên nền tảng của mình.
              </p>
              
              <h3 className="text-white font-medium mt-4">1. Dịch vụ YouTube API Services</h3>
              <p>
                Ứng dụng của chúng tôi sử dụng **YouTube API Services** để thu thập dữ liệu công khai liên quan đến các kênh và video YouTube (như lượt xem, số lượng đăng ký, tiêu đề, mô tả và lịch sử biến động số liệu).
              </p>
              <p>
                Bằng cách sử dụng ứng dụng này, bạn xác nhận và đồng ý bị ràng buộc bởi{" "}
                <a
                  href="https://www.youtube.com/t/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline font-semibold"
                >
                  Điều khoản Dịch vụ của YouTube (YouTube Terms of Service)
                </a>
                .
              </p>

              <h3 className="text-white font-medium mt-4">2. Chính sách Bảo mật của Google</h3>
              <p>
                Chúng tôi không lưu trữ hoặc thu thập thông tin cá nhân hay thông tin đăng nhập tài khoản Google của bạn.
                Vui lòng tham khảo{" "}
                <a
                  href="https://policies.google.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline font-semibold"
                >
                  Chính sách Bảo mật của Google (Google Privacy Policy)
                </a>{" "}
                để biết thêm chi tiết về cách Google xử lý thông tin cá nhân của người dùng.
              </p>

              <h3 className="text-white font-medium mt-4">3. Sử dụng và Lưu trữ Dữ liệu</h3>
              <p>
                Các dữ liệu phân tích thu thập từ YouTube chỉ được sử dụng để xây dựng biểu đồ và bảng theo dõi (ví dụ: Xu hướng lượt xem mỗi giờ - VPH). Dữ liệu này được lưu trữ riêng tư trong cơ sở dữ liệu phân tích của bạn.
              </p>

              <h3 className="text-white font-medium mt-4">4. Thu hồi Quyền truy cập</h3>
              <p>
                Bạn có thể thu hồi quyền truy cập hoặc xóa dữ liệu thu thập bất kỳ lúc nào thông qua trang{" "}
                <a
                  href="https://security.google.com/settings/security/permissions"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline font-semibold"
                >
                  Trang Cài đặt Bảo mật Google
                </a>{" "}
                hoặc chủ động xóa API Key đã cấu hình trong phần Cài đặt hệ thống trên trang web.
              </p>

              <h3 className="text-white font-medium mt-4">5. Chính sách Cookie</h3>
              <p>
                Chúng tôi sử dụng các cookie thiết yếu (strictly necessary cookies) để xác thực tài khoản và duy trì trạng thái đăng nhập của bạn. Các cookie này bắt buộc phải có để đảm bảo tính bảo mật và tính năng cơ bản của ứng dụng, hoàn toàn không theo dõi hoạt động lướt web của bạn trên các trang web khác.
              </p>
            </div>
          </section>

          {/* Footer of Card */}
          <div className="flex flex-col sm:flex-row justify-between items-center pt-8 border-t border-white/10 text-xs text-muted-foreground gap-4">
            <p>© 2026 YouTube BA Analyzer. All rights reserved.</p>
            <div className="flex gap-4">
              <Link href="/terms" className="hover:text-white transition-colors">Terms of Service / Điều khoản</Link>
              <Link href="/login" className="hover:text-white transition-colors">Sign In / Đăng nhập</Link>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
