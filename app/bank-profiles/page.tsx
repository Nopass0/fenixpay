'use client';

import React, { useState } from 'react';
import styles from './BankProfiles.module.css';
import sharedStyles from '@/app/styles/shared.module.css';

export default function BankProfilesPage() {
  const [activeTab, setActiveTab] = useState<'groups' | 'profiles'>('groups');
  const [searchValue, setSearchValue] = useState('');
  const [showAddDropdown, setShowAddDropdown] = useState(false);
  const [showGroupSettings, setShowGroupSettings] = useState(false);
  const [isGroupExpanded, setIsGroupExpanded] = useState(true);

  return (
    <div className={styles.bodyContainer}>
      <div className={sharedStyles.page}>
        {/* Header */}
        <div className={`${styles.wrapper} ${styles.titleWrapper}`}>
          <h1 className={styles.title}>
            <span className={sharedStyles.smHide}>Банковские профили</span>
            <span className={sharedStyles.smShow}>Профили</span>
          </h1>
          <div className={styles.rightElement}>
            <div className={styles.container}>
              <button onClick={() => setShowAddDropdown(!showAddDropdown)}>
                <div className={styles.button}>
                  <span className={styles.accent}>
                    <svg viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" width="24" height="24">
                      <g clipPath="url(#plus-circle_svg__a)">
                        <path d="M9 6v6M6 9h6m4.5 0a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z" stroke="#0052FF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                      </g>
                      <defs>
                        <clipPath id="plus-circle_svg__a">
                          <path fill="#fff" d="M0 0h18v18H0z"></path>
                        </clipPath>
                      </defs>
                    </svg>
                  </span>
                  <span className={sharedStyles.smHide}>Добавить</span>
                </div>
              </button>
              {showAddDropdown && (
                <div className={`${styles.dropDownContainer} ${styles.topBottomPadding}`}>
                  <ul className={styles.dropDown}>
                    <li>
                      <button className={`${styles.item} ${styles.withStyle}`}>
                        <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M18.333 8.333H1.667m7.5 3.333H5M1.667 6.833v6.333c0 .934 0 1.4.181 1.757.16.314.415.569.729.729.356.181.823.181 1.756.181h11.334c.933 0 1.4 0 1.756-.181.314-.16.569-.415.729-.729.181-.356.181-.823.181-1.757V6.833c0-.933 0-1.4-.181-1.756a1.666 1.666 0 0 0-.729-.729c-.356-.181-.823-.181-1.756-.181H4.333c-.933 0-1.4 0-1.756.181-.314.16-.569.415-.729.729-.181.356-.181.823-.181 1.756Z" stroke="#0052FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
                        </svg>
                        <span>Профиль</span>
                      </button>
                    </li>
                    <li>
                      <button className={`${styles.item} ${styles.withStyle}`}>
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="m13 7-1.116-2.231c-.32-.642-.481-.963-.72-1.198a2 2 0 0 0-.748-.462C10.1 3 9.74 3 9.022 3H5.2c-1.12 0-1.68 0-2.108.218a2 2 0 0 0-.874.874C2 4.52 2 5.08 2 6.2V7m0 0h15.2c1.68 0 2.52 0 3.162.327a3 3 0 0 1 1.311 1.311C22 9.28 22 10.12 22 11.8v4.4c0 1.68 0 2.52-.327 3.162a3 3 0 0 1-1.311 1.311C19.72 21 18.88 21 17.2 21H6.8c-1.68 0-2.52 0-3.162-.327a3 3 0 0 1-1.311-1.311C2 18.72 2 17.88 2 16.2V7Z" stroke="#C2CDE2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
                        </svg>
                        <span>Группу</span>
                      </button>
                    </li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Search and Filters Section */}
        <section className={sharedStyles.pageBlock}>
          <div className={sharedStyles.filtersFull}>
            {/* Search by ID */}
            <div>
              <div className={styles.searchTitle}>Поиск по ID</div>
              <div className={`${styles.searchWrapper} ${styles.sm}`}>
                <div className={styles.left}>
                  <span className={styles.accent}>
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="m19 19-3.383-3.383m1.827-4.395a6.222 6.222 0 1 1-12.444 0 6.222 6.222 0 0 1 12.444 0Z" stroke="#C2CDE2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                    </svg>
                  </span>
                </div>
                <div className={`${styles.searchContainer} ${styles.search}`}>
                  <input 
                    className={styles.input} 
                    placeholder="Введите ID" 
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                  />
                </div>
                <div className={styles.inputControls}>
                  <button className={styles.searchButton}>
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="m19 19-3.383-3.383m1.827-4.395a6.222 6.222 0 1 1-12.444 0 6.222 6.222 0 0 1 12.444 0Z" stroke="#C2CDE2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                    </svg>
                  </button>
                  {searchValue && (
                    <button className={styles.cancel} onClick={() => setSearchValue('')}>
                      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M18 6 6 18M6 6l12 12" stroke="#C2CDE2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Desktop Filters */}
            <div className={sharedStyles.desktop}>
              <div className={sharedStyles.filtersGridFull}>
                <div className={styles.filterWrapper}>
                  <div className={styles.filterTitle}>Параметры поиска</div>
                  <div className={styles.filterContainer}>
                    <button className={styles.filterButton}>
                      <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className={styles.iconLeft}>
                        <path d="M2.5 6.667h10m0 0a2.5 2.5 0 1 0 5 0 2.5 2.5 0 0 0-5 0Zm-5 6.666h10m-10 0a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0Z" stroke="#0052FF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                      </svg>
                      <span className={`${styles.selected} ${styles.placeholder}`}>Не выбраны</span>
                      <svg viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg" className={styles.icon}>
                        <path d="m1 1 4 4 4-4" stroke="#899FB8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Sort Dropdown */}
                <div className={styles.sortDesktop}>
                  <div>
                    <div className={styles.label}>Сортировка результатов</div>
                    <div className={`${sharedStyles.paper} ${styles.dropdownWrapper} ${styles.md} ${styles.base}`}>
                      <div className={styles.dropdownInner}>
                        <button className={styles.dropdownButton}>
                          <span className={`${styles.selectedItem} ${styles.baseSelected}`}>
                            <span className={styles.dropdownIcon}>
                              <svg width="20" height="20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M14.167 3.333v13.334m0 0-3.334-3.334m3.334 3.334 3.333-3.334M5.833 16.667V3.333m0 0L2.5 6.667m3.333-3.334 3.334 3.334" stroke="#0052FF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                              </svg>
                            </span>
                            <span className={styles.selectedText}>Сначала новые</span>
                          </span>
                          <svg className={styles.chevron} viewBox="0 0 10 6" fill="none" style={{ height: '10px', width: '10px', transform: 'rotateX(180deg)' }}>
                            <path d="M1 5.03223L5 0.967429L9 5.03223" stroke="#C2CDE2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                          </svg>
                        </button>
                        <ul className={styles.dropDownList}>
                          <li className={`${styles.dropdownItem} ${styles.active}`}>Сначала новые</li>
                          <li className={styles.dropdownItem}>Сначала старые</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile Advanced Search */}
            <div className={sharedStyles.mobile}>
              <div>
                <button className={styles.mobileFilterTitle}>
                  <span>Расширенный поиск</span>
                  <div>
                    <svg viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg" className={styles.chevron}>
                      <path d="m1 1 4 4 4-4" stroke="#899FB8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                    </svg>
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Groups/Profiles List */}
          <div className={sharedStyles.pageList}>
            <div className={styles.block} style={{ gap: '20px' }}>
              {/* Tab Switcher */}
              <div style={{ padding: '4px', backgroundColor: 'rgb(248, 249, 250)', borderRadius: '8px', width: 'min-content' }}>
                <div style={{ width: '100%', position: 'relative', display: 'flex' }}>
                  <div 
                    style={{ 
                      position: 'absolute', 
                      height: '100%', 
                      backgroundColor: 'rgb(240, 244, 252)', 
                      borderRadius: '8px', 
                      left: activeTab === 'groups' ? '0%' : '50%', 
                      top: '0px', 
                      width: '50%',
                      transition: 'left 0.3s ease'
                    }}
                  />
                  <button 
                    aria-label="Группы" 
                    onClick={() => setActiveTab('groups')}
                    style={{ 
                      flex: '1 1 0%', 
                      zIndex: 1, 
                      width: '48px', 
                      height: '40px', 
                      border: 'none', 
                      outline: 'none', 
                      cursor: 'pointer', 
                      backgroundColor: 'transparent', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      color: activeTab === 'groups' ? 'rgb(0, 82, 255)' : '#899FB8',
                      fontWeight: 600
                    }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={activeTab === 'groups' ? styles.tabIconActive : styles.tabIconInactive} style={{ width: '24px', height: '24px' }}>
                      <path d="m13 7-1.116-2.231c-.32-.642-.481-.963-.72-1.198a2 2 0 0 0-.748-.462C10.1 3 9.74 3 9.022 3H5.2c-1.12 0-1.68 0-2.108.218a2 2 0 0 0-.874.874C2 4.52 2 5.08 2 6.2V7m0 0h15.2c1.68 0 2.52 0 3.162.327a3 3 0 0 1 1.311 1.311C22 9.28 22 10.12 22 11.8v4.4c0 1.68 0 2.52-.327 3.162a3 3 0 0 1-1.311 1.311C19.72 21 18.88 21 17.2 21H6.8c-1.68 0-2.52 0-3.162-.327a3 3 0 0 1-1.311-1.311C2 18.72 2 17.88 2 16.2V7Z" stroke={activeTab === 'groups' ? '#0052FF' : '#C2CDE2'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
                    </svg>
                  </button>
                  <button 
                    aria-label="Профили" 
                    onClick={() => setActiveTab('profiles')}
                    style={{ 
                      flex: '1 1 0%', 
                      zIndex: 1, 
                      width: '48px', 
                      height: '40px', 
                      border: 'none', 
                      outline: 'none', 
                      cursor: 'pointer', 
                      backgroundColor: 'transparent', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      color: activeTab === 'profiles' ? 'rgb(0, 82, 255)' : '#899FB8'
                    }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={activeTab === 'profiles' ? styles.tabIconActive : styles.tabIconInactive} style={{ width: '24px', height: '24px' }}>
                      <path d="M8.4 3H4.6c-.56 0-.84 0-1.054.109a1 1 0 0 0-.437.437C3 3.76 3 4.04 3 4.6v3.8c0 .56 0 .84.109 1.054a1 1 0 0 0 .437.437C3.76 10 4.04 10 4.6 10h3.8c.56 0 .84 0 1.054-.109a1 1 0 0 0 .437-.437C10 9.24 10 8.96 10 8.4V4.6c0-.56 0-.84-.109-1.054a1 1 0 0 0-.437-.437C9.24 3 8.96 3 8.4 3ZM19.4 3h-3.8c-.56 0-.84 0-1.054.109a1 1 0 0 0-.437.437C14 3.76 14 4.04 14 4.6v3.8c0 .56 0 .84.109 1.054a1 1 0 0 0 .437.437C14.76 10 15.04 10 15.6 10h3.8c.56 0 .84 0 1.054-.109a1 1 0 0 0 .437-.437C21 9.24 21 8.96 21 8.4V4.6c0-.56 0-.84-.109-1.054a1 1 0 0 0-.437-.437C20.24 3 19.96 3 19.4 3ZM19.4 14h-3.8c-.56 0-.84 0-1.054.109a1 1 0 0 0-.437.437C14 14.76 14 15.04 14 15.6v3.8c0 .56 0 .84.109 1.054a1 1 0 0 0 .437.437C14.76 21 15.04 21 15.6 21h3.8c.56 0 .84 0 1.054-.109a1 1 0 0 0 .437-.437C21 20.24 21 19.96 21 19.4v-3.8c0-.56 0-.84-.109-1.054a1 1 0 0 0-.437-.437C20.24 14 19.96 14 19.4 14ZM8.4 14H4.6c-.56 0-.84 0-1.054.109a1 1 0 0 0-.437.437C3 14.76 3 15.04 3 15.6v3.8c0 .56 0 .84.109 1.054a1 1 0 0 0 .437.437C3.76 21 4.04 21 4.6 21h3.8c.56 0 .84 0 1.054-.109a1 1 0 0 0 .437-.437C10 20.24 10 19.96 10 19.4v-3.8c0-.56 0-.84-.109-1.054a1 1 0 0 0-.437-.437C9.24 14 8.96 14 8.4 14Z" stroke={activeTab === 'profiles' ? '#0052FF' : '#C2CDE2'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
                    </svg>
                  </button>
                </div>
              </div>

              {/* Groups/Profiles Content */}
              <div className={styles.block} style={{ gap: '16px' }}>
                {activeTab === 'groups' && (
                  <div className={`${styles.item} ${styles.group}`}>
                    <div className={styles.general}>
                      <div className={`${styles.iconContainer} ${styles.accent} ${styles.square}`}>
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="m13 7-1.116-2.231c-.32-.642-.481-.963-.72-1.198a2 2 0 0 0-.748-.462C10.1 3 9.74 3 9.022 3H5.2c-1.12 0-1.68 0-2.108.218a2 2 0 0 0-.874.874C2 4.52 2 5.08 2 6.2V7m0 0h15.2c1.68 0 2.52 0 3.162.327a3 3 0 0 1 1.311 1.311C22 9.28 22 10.12 22 11.8v4.4c0 1.68 0 2.52-.327 3.162a3 3 0 0 1-1.311 1.311C19.72 21 18.88 21 17.2 21H6.8c-1.68 0-2.52 0-3.162-.327a3 3 0 0 1-1.311-1.311C2 18.72 2 17.88 2 16.2V7Z" stroke="#C2CDE2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
                        </svg>
                      </div>
                      <div className={styles.textContainer}>
                        <div className={styles.text}>
                          <div className={styles.groupTitle}>Профили без группы</div>
                        </div>
                      </div>
                    </div>
                    <div className={`${styles.center} ${sharedStyles.smHide}`}>
                      <div className={styles.statsContainer}>
                        <div>30 <span className={`${styles.value} ${sharedStyles.muted}`}>БП</span></div>
                      </div>
                      <div className={`${styles.statsContainer} ${sharedStyles.mdHide}`}>
                        <div><span className={`${styles.value} ${sharedStyles.placeHolder}`}>0%</span></div>
                      </div>
                    </div>
                    <div className={styles.right}>
                      <div className={styles.container}>
                        <button onClick={() => setShowGroupSettings(!showGroupSettings)}>
                          <div className={`${styles.settingsButton} ${sharedStyles.accent}`}>
                            <span className={sharedStyles.smHide}>Настроить</span>
                            <svg viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" className={sharedStyles.smShow} width="18" height="18">
                              <g clipPath="url(#settings-02_svg__a)" stroke="#0052FF" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
                                <path d="m4.698 9.686.292.657a1.106 1.106 0 0 0 2.022 0l.292-.657a1.213 1.213 0 0 1 1.235-.712l.715.076a1.106 1.106 0 0 0 1.011-1.751l-.423-.582A1.214 1.214 0 0 1 9.612 6c0-.257.081-.507.232-.714l.424-.582a1.105 1.105 0 0 0-1.012-1.751l-.715.076a1.213 1.213 0 0 1-1.235-.714l-.294-.658a1.106 1.106 0 0 0-2.022 0l-.292.657a1.213 1.213 0 0 1-1.235.715l-.718-.076a1.106 1.106 0 0 0-1.01 1.75l.423.583a1.214 1.214 0 0 1 0 1.428l-.424.582a1.106 1.106 0 0 0 1.011 1.751l.715-.076a1.217 1.217 0 0 1 1.238.715Z"></path>
                                <path d="M6 7.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z"></path>
                              </g>
                              <defs>
                                <clipPath id="settings-02_svg__a">
                                  <path fill="#fff" d="M0 0h12v12H0z"></path>
                                </clipPath>
                              </defs>
                            </svg>
                          </div>
                        </button>
                        {showGroupSettings && (
                          <div className={`${styles.dropDownContainer} ${styles.topBottomPadding}`}>
                            <ul className={styles.dropDown}>
                              <li>
                                <button className={`${styles.item} ${styles.withStyle}`}>
                                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10Z" stroke="#0052FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
                                    <path d="M9.5 8.965c0-.477 0-.716.1-.849a.5.5 0 0 1 .364-.199c.166-.012.367.117.769.375l4.72 3.035c.349.224.523.336.583.478a.5.5 0 0 1 0 .39c-.06.142-.234.254-.583.478l-4.72 3.035c-.402.258-.603.387-.769.375a.5.5 0 0 1-.364-.2c-.1-.132-.1-.371-.1-.848v-6.07Z" stroke="#0052FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
                                  </svg>
                                  <span>Включить профили</span>
                                </button>
                              </li>
                              <li>
                                <button className={`${styles.item} ${styles.withStyle}`}>
                                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M9.5 15V9m5 6V9m7.5 3c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2s10 4.477 10 10Z" stroke="#0052FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
                                  </svg>
                                  <span>Выключить профили</span>
                                </button>
                              </li>
                            </ul>
                          </div>
                        )}
                      </div>
                      <button 
                        className={styles.expandButton}
                        onClick={() => setIsGroupExpanded(!isGroupExpanded)}
                      >
                        <svg 
                          xmlns="http://www.w3.org/2000/svg" 
                          viewBox="0 0 10 6" 
                          fill="none" 
                          style={{ 
                            height: '12px', 
                            width: '12px', 
                            transform: isGroupExpanded ? 'rotateX(180deg)' : 'none',
                            transition: 'transform 0.3s ease'
                          }}
                        >
                          <path d="M1 5.03223L5 0.967429L9 5.03223" stroke="#C2CDE2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                        </svg>
                      </button>
                    </div>
                  </div>
                )}

                {activeTab === 'profiles' && (
                  <div className={styles.profilesList}>
                    {/* Profile items would go here */}
                    <p>Профили будут отображаться здесь</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}