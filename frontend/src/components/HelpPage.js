// src/components/HelpPage.js
import React from 'react';
import './HelpPageStyles.css';

const HelpPage = () => {
  return (
    <div className="help-container">
      <h1 className="help-title">Справка по системе оплаты платных дорог</h1>
      
      <section className="help-section">
        <h2>Общая информация</h2>
        <p>
          Система оплаты платных дорог позволяет пользователям планировать маршруты и оплачивать необходимые тарифы. 
          Тарифы зависят от типа транспортного средства, массы и количества осей. Ознакомьтесь с актуальными тарифами ниже.
        </p>
      </section>

      <section className="help-section">
        <h2>Тарифы на проезд по платным автодорогам</h2>
        <div className="tariff-table">
          <div className="tariff-row">
            <div className="tariff-header">
              <h3>Весь транспорт ≤ 3,5 т</h3>
            </div>
            <div className="tariff-details">
              <div className="tariff-item">
                <span>20 €</span> <span>15 дней</span>
              </div>
              <div className="tariff-item">
                <span>31 €</span> <span>30 дней</span>
              </div>
              <div className="tariff-item">
                <span>107 €</span> <span>1 год</span>
              </div>
              
            </div>
          </div>

          <div className="tariff-row">
            <div className="tariff-header">
              <h3>Весь транспорт &gt; 3,5 т, ≤ 2 осей</h3>
            </div>
            <div className="tariff-details">
              <p className="tariff-note">0,114 €/км</p>
            </div>
          </div>

          <div className="tariff-row">
            <div className="tariff-header">
              <h3>Весь транспорт &gt; 3,5 т, ≥ 3 осей</h3>
            </div>
            <div className="tariff-details">
              <p className="tariff-note">0,142 €/км</p>
            </div>
          </div>

          <div className="tariff-row">
            <div className="tariff-header">
              <h3>Весь транспорт &gt; 3,5 т, ≥ 4 осей</h3>
            </div>
            <div className="tariff-details">
              <p className="tariff-note">0,171 €/км</p>
            </div>
          </div>
        </div>
        <p className="tariff-disclaimer">
          * Утверждены Министерством транспорта и коммуникаций Республики Беларусь.
        </p>
      </section>

      <section className="help-section">
        <h2>Способы оплаты</h2>
        <p>
          Оплата производится банковскими картами: Visa, MasterCard. Также доступны другие способы оплаты через 
          банковские терминалы или онлайн-сервисы.
        </p>
        <div className="payment-methods">
          <img src="https://upload.wikimedia.org/wikipedia/commons/4/41/Visa_Logo.png" alt="Visa" className="payment-logo" />
          <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="MasterCard" className="payment-logo" />
        </div>
      </section>

      <section className="help-section">
        <h2>Дополнительная информация</h2>
        <p>
          Для получения виньетки обратитесь в пункты продажи, отмеченные на карте маршрутов. Стоимость виньетки 
          зависит от выбранного периода и типа транспортного средства. Подробности доступны в разделе "Маршруты".
        </p>
      </section>
    </div>
  );
};

export default HelpPage;