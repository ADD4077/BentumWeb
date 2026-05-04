from django.core.management.base import BaseCommand

from api.content_parser_service import BNTUContentParserService


class Command(BaseCommand):
    help = "Синхронизирует контент БНТУ напрямую в MySQL: новости, расписание и литературу."

    def add_arguments(self, parser):
        parser.add_argument("--literature", action="store_true", help="Синхронизировать только литературу.")
        parser.add_argument("--news", action="store_true", help="Синхронизировать только новости.")
        parser.add_argument("--schedule", action="store_true", help="Синхронизировать только расписание.")
        parser.add_argument(
            "--literature-bootstrap",
            action="store_true",
            help="Принудительно выполнить полную первичную загрузку литературы через REST API.",
        )
        parser.add_argument(
            "--literature-incremental",
            action="store_true",
            help="Принудительно выполнить только инкрементальное обновление литературы.",
        )
        parser.add_argument(
            "--literature-sample",
            type=int,
            default=0,
            help="Загрузить тестовую выборку литературы: до N записей на каждый раздел.",
        )
        parser.add_argument(
            "--news-bootstrap",
            action="store_true",
            help="Принудительно выполнить полную первичную загрузку новостей за последние 2 года.",
        )
        parser.add_argument(
            "--news-incremental",
            action="store_true",
            help="Принудительно выполнить только инкрементальное обновление новостей.",
        )

    def handle(self, *args, **options):
        parser_service = BNTUContentParserService()
        targets = self._resolve_targets(options)

        if "literature" in targets:
            if options["literature_sample"]:
                count = parser_service.sync_literature_bootstrap(sample_per_section=options["literature_sample"])
            elif options["literature_bootstrap"]:
                count = parser_service.sync_literature_bootstrap()
            elif options["literature_incremental"]:
                count = parser_service.sync_literature_incremental()
            else:
                count = parser_service.sync_literature()
            self.stdout.write(self.style.SUCCESS(f"literature: синхронизировано {count} записей"))

        if "news" in targets:
            if options["news_bootstrap"]:
                count = parser_service.sync_news_bootstrap()
            elif options["news_incremental"]:
                count = parser_service.sync_news_incremental()
            else:
                count = parser_service.sync_news()
            self.stdout.write(self.style.SUCCESS(f"news: синхронизировано {count} записей"))

        if "schedule" in targets:
            count = parser_service.sync_schedule()
            self.stdout.write(self.style.SUCCESS(f"schedule: синхронизировано {count} записей"))

    def _resolve_targets(self, options):
        selected = {
            "literature": (
                options["literature"]
                or options["literature_bootstrap"]
                or options["literature_incremental"]
                or bool(options["literature_sample"])
            ),
            "news": options["news"] or options["news_bootstrap"] or options["news_incremental"],
            "schedule": options["schedule"],
        }
        targets = [name for name, enabled in selected.items() if enabled]
        return targets or ["literature", "news", "schedule"]
