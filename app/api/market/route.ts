// app/api/market/route.ts
import { NextResponse } from 'next/server';

// 💡 Next.js에게 이 API는 절대 캐싱하지 말라고 강력하게 지시합니다.
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 네이버 모바일 금융 API 동시 호출 (캐시 없이 실시간 데이터 요청)
    const [kospiRes, kosdaqRes, hanwhaRes] = await Promise.all([
      fetch('https://m.stock.naver.com/api/index/KOSPI/basic', { cache: 'no-store' }),
      fetch('https://m.stock.naver.com/api/index/KOSDAQ/basic', { cache: 'no-store' }),
      // 003530은 한화투자증권의 종목 코드입니다.
      fetch('https://m.stock.naver.com/api/stock/003530/basic', { cache: 'no-store' })
    ]);

    const kospiData = await kospiRes.json();
    const kosdaqData = await kosdaqRes.json();
    const hanwhaData = await hanwhaRes.json();

    // 프론트엔드에서 쓰기 편하게 데이터 규격화 함수
    const formatData = (data: any) => {
      // API 응답 구조에 맞게 데이터 추출 (result 래핑 여부 대응)
      const info = data.result || data; 
      return {
        price: info.closePrice, // 현재가
        change: info.compareToPreviousClosePrice, // 전일비
        rate: info.fluctuationsRatio, // 등락률
        direction: info.compareToPreviousPrice?.code // 2: 상승, 5: 하락, 3: 보합
      };
    };

    // 정제된 데이터를 프론트엔드로 전달
    return NextResponse.json({
      kospi: formatData(kospiData),
      kosdaq: formatData(kosdaqData),
      hanwha: formatData(hanwhaData),
    });

  } catch (error) {
    console.error('Market API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch market data' }, { status: 500 });
  }
}