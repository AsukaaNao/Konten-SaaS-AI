import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bottom-0 left-0 w-full bg-white backdrop-blur-sm shadow-lg z-50 border-t border-gray-200">
      <div className="container mx-auto px-4 md:px-8 py-3">
        <div className="flex justify-center items-center">
          <p className="text-sm text-gray-600 mr-4">
            Siap meningkatkan kualitas kontenmu?
          </p>
          <a
            href="https://api.whatsapp.com/send/?phone=6285330168811&text=Hai%2C+saya+tertarik+untuk+mendiskusikan+layanan+pembuatan+konten+untuk+proyek+kami.+Apakah+kita+bisa+jadwalkan+pembicaraan+singkat+untuk+membahas+strategi%2C+deliverables%2C+dan+harga%3F&type=phone_number&app_absent=0"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 text-white font-semibold rounded-lg shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2"
            style={{
              backgroundColor: '#5890AD',
              borderColor: '#5890AD',
            }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#4a7e97')}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#5890AD')}
          >
            Hubungi Kami
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
