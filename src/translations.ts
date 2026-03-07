export type Language = 'pt' | 'en' | 'es' | 'zh';

export const translations = {
    pt: {
        settings: {
            title: "Ajustes",
            subtitle: "Configurações do sistema Kiosker.",
            browser: {
                title: "Navegador de vídeo",
                desc: "Escolha o motor de navegação para sites e streamings. O Firefox é altamente recomendado por sua compatibilidade com extensões de privacidade.",
                firefox_desc: "Melhor performance & privacidade",
                chrome_desc: "Compatibilidade padrão",
                migrating: "Migrando perfil...",
            },
            startup: {
                title: "Inicialização",
                desc: "Deixe o Kiosker pronto assim que você ligar seu dispositivo.",
                autostart: "Iniciar com o sistema",
            },
            data: {
                title: "Dados e backup",
                desc: "Gerencie sua biblioteca de aplicativos e streamings salvos.",
                export: "Exportar biblioteca (.sqlite)",
                import: "Importar snapshot manual",
            },
            commands: {
                title: "Guia de comandos",
                desc: "Como controlar suas aplicações e o launcher em qualquer dispositivo.",
                header_action: "Ação global",
                header_keyboard: "Pelo teclado",
                header_mouse: "Pelo mouse",
                header_joystick: "Pelo joystick",
                exit: {
                    title: "Sair / fechar tudo",
                    desc: "Volta imediatamente para o Kiosker",
                    mouse: "3 cliques rápidos (esq.)",
                },
                manage: {
                    title: "Gerenciar item",
                    desc: "Ações como 'Fechar' ou 'Reiniciar'",
                    keyboard: "SHIFT + F10",
                    keyboard_fallback: "ou Shift + F10",
                    mouse: "Botão direito",
                }
            },
            language: {
                title: "Idioma",
                desc: "Escolha o idioma da interface do Kiosker.",
            }
        },
        common: {
            open: "Abrir",
            close: "Fechar",
            delete: "Excluir da biblioteca",
            running: "Rodando",
            restart: "Reiniciar",
            controller_hint: "Controlador: Enter ou Menu",
            loading: "Carregando...",
        },
        home: {
            recent: "Seus itens recentes",
            apps: "Aplicações",
            web: "Web",
            start: "Início",
            hint_return: "para voltar ao kiosker sempre que necessário!",
        }
    },
    en: {
        settings: {
            title: "Settings",
            subtitle: "Kiosker system configurations.",
            browser: {
                title: "Video browser",
                desc: "Choose the navigation engine for sites and streamings. Firefox is highly recommended for its privacy extension compatibility.",
                firefox_desc: "Best performance & privacy",
                chrome_desc: "Standard compatibility",
                migrating: "Migrating profile...",
            },
            startup: {
                title: "Startup",
                desc: "Have Kiosker ready as soon as you turn on your device.",
                autostart: "Start with system",
            },
            data: {
                title: "Data and backup",
                desc: "Manage your library of saved apps and streamings.",
                export: "Export library (.sqlite)",
                import: "Import manual snapshot",
            },
            commands: {
                title: "Command guide",
                desc: "How to control your applications and the launcher on any device.",
                header_action: "Global action",
                header_keyboard: "Keyboard",
                header_mouse: "Mouse",
                header_joystick: "Joystick",
                exit: {
                    title: "Exit / close all",
                    desc: "Immediately return to Kiosker",
                    mouse: "3 quick left-clicks",
                },
                manage: {
                    title: "Manage item",
                    desc: "Actions like 'Close' or 'Restart'",
                    keyboard: "SHIFT + F10",
                    keyboard_fallback: "or Shift + F10",
                    mouse: "Right click",
                }
            },
            language: {
                title: "Language",
                desc: "Choose the Kiosker interface language.",
            }
        },
        common: {
            open: "Open",
            close: "Close",
            delete: "Delete from library",
            running: "Running",
            restart: "Restart",
            controller_hint: "Controller: Enter or Menu",
            loading: "Loading...",
        },
        home: {
            recent: "Your recent items",
            apps: "Applications",
            web: "Web",
            start: "Home",
            hint_return: "to return to kiosker whenever needed!",
        }
    },
    es: {
        settings: {
            title: "Ajustes",
            subtitle: "Configuraciones del sistema Kiosker.",
            browser: {
                title: "Navegador de vídeo",
                desc: "Elija el motor de navegación para sitios y transmisiones. Firefox es altamente recomendado por su compatibilidad con extensiones de privacidad.",
                firefox_desc: "Mejor rendimiento y privacidad",
                chrome_desc: "Compatibilidad estándar",
                migrating: "Migrando perfil...",
            },
            startup: {
                title: "Inicio",
                desc: "Tenga Kiosker listo tan pronto como encienda su dispositivo.",
                autostart: "Iniciar con el sistema",
            },
            data: {
                title: "Datos y copia de seguridad",
                desc: "Gestione su biblioteca de aplicaciones y transmisiones guardadas.",
                export: "Exportar biblioteca (.sqlite)",
                import: "Importar snapshot manual",
            },
            commands: {
                title: "Guía de comandos",
                desc: "Cómo controlar sus aplicaciones y el lanzador en cualquier dispositivo.",
                header_action: "Acción global",
                header_keyboard: "Teclado",
                header_mouse: "Ratón",
                header_joystick: "Joystick",
                exit: {
                    title: "Salir / cerrar todo",
                    desc: "Regresa inmediatamente a Kiosker",
                    mouse: "3 clics rápidos (izq.)",
                },
                manage: {
                    title: "Gestionar ítem",
                    desc: "Acciones como 'Cerrar' o 'Reiniciar'",
                    keyboard: "SHIFT + F10",
                    keyboard_fallback: "o Shift + F10",
                    mouse: "Clic derecho",
                }
            },
            language: {
                title: "Idioma",
                desc: "Elija el idioma de la interfaz de Kiosker.",
            }
        },
        common: {
            open: "Abrir",
            close: "Cerrar",
            delete: "Eliminar de la biblioteca",
            running: "Ejecutando",
            restart: "Reiniciar",
            controller_hint: "Controlador: Enter o Menú",
            loading: "Cargando...",
        },
        home: {
            recent: "Tus elementos recientes",
            apps: "Aplicaciones",
            web: "Web",
            start: "Inicio",
            hint_return: "para volver a kiosker siempre que sea necesario!",
        }
    },
    zh: {
        settings: {
            title: "设置",
            subtitle: "Kiosker 系统配置。",
            browser: {
                title: "视频浏览器",
                desc: "选择网站和流媒体的导航引擎。强烈推荐使用 Firefox，因为它具有隐私扩展兼容性。",
                firefox_desc: "最佳性能与隐私",
                chrome_desc: "标准兼容性",
                migrating: "正在迁移配置文件...",
            },
            startup: {
                title: "启动",
                desc: "开启设备后立即准备好 Kiosker。",
                autostart: "随系统启动",
            },
            data: {
                title: "数据与备份",
                desc: "管理您保存的应用和流媒体库。",
                export: "导出库 (.sqlite)",
                import: "手动导入快照",
            },
            commands: {
                title: "命令指南",
                desc: "如何在任何设备上控制您的应用程序和启动器。",
                header_action: "全局操作",
                header_keyboard: "键盘",
                header_mouse: "鼠标",
                header_joystick: "摇杆",
                exit: {
                    title: "退出 / 全部关闭",
                    desc: "立即返回 Kiosker",
                    mouse: "3次左键快速点击",
                },
                manage: {
                    title: "管理项目",
                    desc: "类似于'关闭'或'重启'的操作",
                    keyboard: "SHIFT + F10",
                    keyboard_fallback: "或 Shift + F10",
                    mouse: "右键点击",
                }
            },
            language: {
                title: "语言",
                desc: "选择 Kiosker 界面语言。",
            }
        },
        common: {
            open: "打开",
            close: "关闭",
            delete: "从库中删除",
            running: "正在运行",
            restart: "重启",
            controller_hint: "控制器：Enter 或 菜单",
            loading: "正在加载...",
        },
        home: {
            recent: "您最近的项目",
            apps: "应用",
            web: "网页",
            start: "首页",
            hint_return: "随时返回 Kiosker！",
        }
    }
};
