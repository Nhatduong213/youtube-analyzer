import Link from "next/link";
import { Scale, ArrowLeft, Shield, FileText, AlertTriangle } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground py-12 px-4 sm:px-6 lg:px-8">
      {/* Decorative ambient orbs */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-violet-500/5 rounded-full blur-3xl pointer-events-none" />

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
            <Scale className="h-10 w-10 text-primary animate-pulse" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2">Terms of Service</h1>
          <p className="text-lg text-muted-foreground">Điều khoản dịch vụ sử dụng ứng dụng</p>
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
                By accessing or using <strong>YouTube BA Analyzer</strong>, you agree to comply with and be bound by the following Terms of Service. If you do not agree to these terms, please do not use the application.
              </p>
              
              <h3 className="text-white font-medium mt-4">1. Agreement to YouTube Terms</h3>
              <p>
                This application accesses public information via the YouTube API. By utilizing our tools and services, you explicitly agree to be bound by the{" "}
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

              <h3 className="text-white font-medium mt-4">2. Proper Use of Service</h3>
              <p>
                You agree not to exploit our application for any illegal activities, nor to spam Google/YouTube API services with malicious requests. The application is meant strictly for personal or business channel analytics.
              </p>

              <h3 className="text-white font-medium mt-4">3. Disclaimer of Warranties</h3>
              <p>
                The application is provided "as is". We make no warranties of any kind regarding accuracy, uptime, or availability of the Google APIs.
              </p>
            </div>
          </section>

          {/* Section 2: VI */}
          <section className="space-y-4 pt-6 border-t border-white/5">
            <h2 className="text-2xl font-semibold text-white flex items-center border-b border-white/10 pb-2">
              <Shield className="mr-3 h-6 w-6 text-primary" /> Tiếng Việt (Vietnamese)
            </h2>
            
            <div className="space-y-4 text-muted-foreground leading-relaxed text-sm">
              <p>
                <strong>Cập nhật lần cuối: Ngày 27 tháng 5, 2026</strong>
              </p>
              <p>
                Bằng việc truy cập hoặc sử dụng ứng dụng <strong>YouTube BA Analyzer</strong>, bạn đồng ý tuân thủ và chịu sự ràng buộc bởi các Điều khoản dịch vụ dưới đây. Nếu bạn không đồng ý, vui lòng ngừng sử dụng dịch vụ của chúng tôi.
              </p>
              
              <h3 className="text-white font-medium mt-4">1. Thừa nhận và Đồng ý các điều khoản YouTube</h3>
              <p>
                Ứng dụng này truy cập thông tin công khai thông qua YouTube API. Bằng việc sử dụng công cụ của chúng tôi, bạn đồng ý rõ ràng với{" "}
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

              <h3 className="text-white font-medium mt-4">2. Sử dụng Dịch vụ Hợp lệ</h3>
              <p>
                Bạn cam kết không sử dụng ứng dụng vào các mục đích bất hợp pháp, không cố ý spam dịch vụ YouTube API, hoặc gây nghẽn tiến trình phân tích. Ứng dụng được thiết kế nhằm mục đích hỗ trợ cá nhân và doanh nghiệp theo dõi số liệu thống kê kênh.
              </p>

              <h3 className="text-white font-medium mt-4">3. Tuyên bố từ chối trách nhiệm</h3>
              <p>
                Ứng dụng được cung cấp "nguyên trạng". Chúng tôi không chịu trách nhiệm hay đảm bảo tuyệt đối về tính liên tục của dữ liệu khi API phía Google/YouTube thay đổi hay ngắt kết nối tạm thời.
              </p>
            </div>
          </section>

          {/* Footer of Card */}
          <div className="flex flex-col sm:flex-row justify-between items-center pt-8 border-t border-white/10 text-xs text-muted-foreground gap-4">
            <p>© 2026 YouTube BA Analyzer. All rights reserved.</p>
            <div className="flex gap-4">
              <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy / Bảo mật</Link>
              <Link href="/login" className="hover:text-white transition-colors">Sign In / Đăng nhập</Link>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
