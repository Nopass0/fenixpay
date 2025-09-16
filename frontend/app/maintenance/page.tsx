'use client';

export default function MaintenancePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-12 max-w-2xl w-full">
        <div className="text-center">
          <div className="mb-6 flex justify-center">
            <svg
              className="w-24 h-24 text-blue-500 animate-pulse"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">
            Технические работы
          </h1>

          <h2 className="text-xl md:text-2xl font-semibold text-blue-600 mb-6">
            Мы обновляем систему
          </h2>

          <p className="text-gray-600 text-lg mb-8 leading-relaxed">
            В настоящее время проводятся технические работы для улучшения качества наших услуг.
            Платформа временно недоступна.
          </p>

          <div className="bg-blue-50 rounded-lg p-6 mb-8">
            <p className="text-gray-700 font-medium mb-2">
              Ориентировочное время завершения работ:
            </p>
            <p className="text-2xl font-bold text-blue-600">
              30-60 минут
            </p>
          </div>

          <div className="border-t pt-6">
            <p className="text-sm text-gray-500 mb-2">
              Приносим извинения за временные неудобства
            </p>
            <p className="text-sm text-gray-500">
              По вопросам обращайтесь в поддержку
            </p>
          </div>

          <div className="mt-8 flex justify-center space-x-4">
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition-colors duration-200 flex items-center space-x-2"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              <span>Обновить страницу</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}