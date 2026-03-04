import re

with open("web/src/app/page.tsx", "r") as f:
    main_code = f.read()

with open("/tmp/feature_page.tsx", "r") as f:
    feat_code = f.read()

# get everything before the first return in main
main_top_match = re.search(r"([\s\S]+?)return \(", main_code)
main_top = main_top_match.group(1) if main_top_match else ""

# get everything from return onwards in feature
feat_bottom_match = re.search(r"(return \([\s\S]+)", feat_code)
feat_bottom = feat_bottom_match.group(1) if feat_bottom_match else ""

# Also need to grab imports from feature
feat_imports = [
    "import { motion } from \"framer-motion\";",
    "import {\n  BarChart3,\n  TrendingUp,\n  Shield,\n  Zap,\n  Users,\n  Bell,\n  ArrowRight,\n  Check,\n  Play,\n  Activity,\n  Globe,\n  Lock,\n  CheckCircle,\n  Plus,\n  Rocket,\n  MessageCircle,\n  Upload,\n  Code2,\n  Database,\n  Sparkles,\n} from \"lucide-react\";",
    "import { Header } from \"@/components/Header\";",
    "import { Button } from \"@/components/Button\";",
    "import { Input, Textarea } from \"@/components/Input\";",
    "import { VisualizationDisplay } from \"@/components/VisualizationDisplay\";"
]

for imp in feat_imports:
    if imp not in main_top:
        main_top = main_top.replace("import Image from \"next/image\";", "import Image from \"next/image\";\n" + imp)

# Write out merged
with open("web/src/app/page.tsx", "w") as f:
    f.write(main_top + feat_bottom)

print("Merged page.tsx")
