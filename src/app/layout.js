export const metadata = {
  title: 'NaviBiz - SIG UMKM Jakarta Barat',
  description: 'Sistem Informasi Geografis UMKM',
}

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  )
}