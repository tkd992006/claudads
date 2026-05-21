import Link from "next/link";

export default function Landing() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-16 space-y-10">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold">Claude Ad Terminal</h1>
        <p className="text-neutral-400">
          터미널이 일하는 시간, 가만 두지 마세요. Claude 가 코드를 짜는 동안
          짧은 광고 한 편이 흐르고, 작업이 끝날 즈음엔 잔고가 자라 있다.
        </p>
      </header>

      <section className="grid md:grid-cols-2 gap-4">
        <div className="card space-y-2">
          <h2 className="font-semibold">시청자 (개발자)</h2>
          <p className="text-sm text-neutral-400">
            데스크탑 앱을 받고 GitHub 로 로그인. Claude busy 시간에 광고가 흐르고
            잔고가 쌓입니다.
          </p>
          <Link className="btn-primary inline-block" href="/dashboard">
            대시보드 →
          </Link>
        </div>
        <div className="card space-y-2">
          <h2 className="font-semibold">광고주</h2>
          <p className="text-sm text-neutral-400">
            영상 한 편, 예산, CPM. 청중이 100 % 개발자.
          </p>
          <Link className="btn-primary inline-block" href="/advertiser">
            광고주 콘솔 →
          </Link>
        </div>
      </section>
    </main>
  );
}
