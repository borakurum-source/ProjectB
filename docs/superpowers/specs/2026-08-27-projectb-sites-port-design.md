# ProjectB: Sites ve Neon taşıma tasarımı

## Amaç

GitHub'daki ProjectB uygulamasını Sites üzerinde yayınlamak, mevcut RAG Signal Neon veritabanını kullanmak ve mevcut kullanıcı akışlarını (müşteri yönetimi, prompt/runs, analiz, aksiyonlar, Brand Memory, AEO Studio, GSC/GA4 ve AI araç entegrasyonları) korumaktır. Erişim yalnızca Bora Kurum ve dahili RAG Signal ekibi ile sınırlandırılır.

## Mevcut durum ve zorunlu değişiklikler

Kaynak uygulama React/Vite arayüzü, büyük bir Express `server.ts` API katmanı ve `pg` üzerinden TCP Postgres bağlantısı kullanıyor. Sites hedefi ise Cloudflare Worker tabanlı olduğundan raw TCP ve Node/Express sunucu çıktısını çalıştıramaz.

RAG Signal Neon projesinde uygulamanın beklediği `clients`, `prompts`, `runs`, `run_cycles`, `diagnostics`, `actions`, `page_analyses`, `brand_memories`, `aeo_contents`, `settings`, `google_integrations` ve `users` tabloları zaten bulunuyor. Bu taşıma tablo silme, demo veri seed etme veya mevcut veriyi değiştirme yapmayacak.

Eski kaynakta bulunan demo kullanıcı davranışı ve kod içine yazılmış geçmiş bağlantı bilgileri canlıya taşınmayacak.

## Seçilen yaklaşım

1. Sites uygulaması mevcut Vinext/Worker yapısında kalır; GitHub kaynağındaki React bileşenleri bu yapıya alınır.
2. Express uç noktalarının kamu sözleşmesi (`/api/...` yolları ve istemcinin beklediği JSON şekilleri) korunur, fakat uygulama Worker uyumlu route handler'lara bölünür.
3. Veritabanı erişimi `@neondatabase/serverless` ile HTTP üzerinden yapılır. `DATABASE_URL` yalnızca Sites ortam değişkeni olarak tutulur; hiçbir bağlantı değeri kaynak koda veya tarayıcıya verilmez.
4. Yönetilen Neon Auth ile oturum doğrulanır. İlk aşamada Google oturum açma kullanılır; başarılı girişte adres `INTERNAL_EMAIL_ALLOWLIST` içinde değilse erişim reddedilir. Açık kayıt, varsayılan demo yönetici hesabı ve misafir girişi kaldırılır.
5. Sites yayını önce özel erişimde tutulur. Uygulama içi yetkilendirme bunun ikinci katmanıdır ve ekibin izin listesi üzerinden yönetilir.

## Bileşen sınırları

### Arayüz

- ProjectB'nin ekranları, sekmeleri, grafikleri ve modal akışları korunur.
- Giriş ekranı yalnızca dahili Google oturumunu başlatır; şifre alanı ve demo kimlik bilgileri kaldırılır.
- İstemci, mevcut `/api` çağrılarını kullanmaya devam eder. Oturum bilgisi her korumalı istekte gönderilir.
- Eksik kurulumlar için anlaşılır durum mesajları gösterilir; arayüz sahte başarı veya demo verisi üretmez.

### Worker API

- Küçük route modülleri auth, veri erişimi, analiz/runs, Brand Memory, AEO Studio ve Google entegrasyonu alanlarına ayrılır.
- Her korumalı rota önce oturum ve izin listesini doğrular, sonra yalnızca doğrulanmış kullanıcı adına veri okur veya yazar.
- Uzun süren harici çağrılar (Gemini, Perplexity, Firecrawl, Google) hata, zaman aşımı ve eksik yapılandırma durumlarını yapılandırılmış JSON hatası ile döndürür.
- İstemcinin kullandığı mevcut veri biçimleri değişmeden korunur; gerekiyorsa uyumluluk dönüştürücüleri Worker katmanında bulunur.

### Neon veri erişimi

- Sorgular HTTP tabanlı Neon serverless driver ile yürür; Worker'da `pg`, `Pool` veya raw socket kullanılmaz.
- İlk canlı adımda şema salt-okunur doğrulanır. Şema uyuşmazlığı varsa yalnızca hedefe yönelik, geri alınabilir bir migration hazırlanır; kullanıcı verisi silinmez.
- API anahtarları ve OAuth tokenları normal uygulama verisi olarak geri dönmez. Google tokenları yazılması gerektiğinde uygulama şifreleme anahtarı ile şifrelenmiş olarak saklanır.

### Kimlik ve erişim

- Neon Auth oturumları kaynak doğrulama için kullanılır.
- `INTERNAL_EMAIL_ALLOWLIST` Sites sırrı ilk değer olarak `bora@ragsignal.com` içerir; diğer ekip üyeleri bu listeden eklenir veya çıkarılır.
- Yetkisiz hesaplar açık hata alır, hiçbir müşteri verisi alamaz.
- GSC/GA4 OAuth callback'i yayınlanmış Sites URL'si ile eşleştirilir. Callback URL değişirse Google Cloud ayarındaki izinli yönlendirme adresi de güncellenir.

## Gizli ortam yapılandırması

Sites üzerinde aşağıdaki değerler kaynak kod dışında tutulur:

| Değişken | Amaç |
| --- | --- |
| `DATABASE_URL` | Neon HTTP bağlantısı |
| `NEON_AUTH_URL` ve ilgili Neon Auth ayarları | dahili kullanıcı oturumları |
| `INTERNAL_EMAIL_ALLOWLIST` | izinli ekip e-postaları |
| `GEMINI_API_KEY` | Gemini destekli analiz ve içerik üretimi |
| `PERPLEXITY_API_KEY` | Perplexity Sonar çalıştırmaları |
| `FIRECRAWL_API_KEY` | crawl, scrape ve analiz işlemleri |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | GSC/GA4 OAuth |
| `TOKEN_ENCRYPTION_KEY` | depolanan Google tokenlarının şifrelenmesi |
| `APP_URL` | OAuth callback ve uygulama bağlantıları |

Bu değerlerden biri yoksa yalnızca ona bağlı özellik devre dışı kalır; uygulamanın geri kalanı çalışmaya devam eder.

## Güvenlik kuralları

- Kaynak, hata mesajı, istemci bundle'ı veya loglarda gizli değer bulunmaz.
- Eski kaynakta görülen sabit bağlantı bilgileri silinir ve kullanılmaz.
- Her veri mutasyonu dahili oturum doğrulamasına tabi olur.
- Harici API anahtarlarının kullanıcı ayarları tablosundan okunup istemciye dönmesi engellenir; dağıtım ayarları tek kaynak olur.
- Veritabanı yapı değişikliği gerekiyorsa önce şema karşılaştırması yapılır, sonra ayrı migration onayı alınır.

## Doğrulama ve yayın

1. GitHub kaynağı Sites checkout'una aktarılır ve Worker build düzenine uyarlanır.
2. Worker build'i, TypeScript kontrolleri ve route seviyesinde auth/veri erişim testleri çalışır.
3. Salt-okunur Neon doğrulaması ile temel müşteri, prompt ve run verisinin mevcut şemadan okunabildiği kontrol edilir.
4. İlk özel Sites yayını yapılır. URL oluşunca `APP_URL` ve Google OAuth callback ayarları eşleştirilir.
5. Dahili Google girişi, izin listesi reddi, bir veri okuma akışı ve bir API hata durumu doğrulanır.

## Başarı ölçütleri

- Sites üzerinde yayınlanan uygulama mevcut RAG Signal Neon verisini canlı ve güvenli biçimde kullanır.
- Dahili ekip dışındaki kullanıcılar erişemez.
- ProjectB'nin mevcut çalışma alanı ve analiz modülleri sahte veri veya hardcoded erişim bilgisi olmadan açılır.
- Gemini, Perplexity, Firecrawl ve GSC/GA4 modülleri gerekli secret'lar tanımlandığında aynı arayüzden çalışır.
- Kaynak build çıktısı Sites'in ESM Worker gereksinimini karşılar.
