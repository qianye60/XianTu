import sys
import os
import runpy

# 将项目根目录添加到 Python 搜索路径的最前面
# 这是为了确保无论从哪里运行此脚本，'server' 模块都能被正确找到
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

if __name__ == "__main__":
    """
    这是一个包装脚本，用于解决在某些环境下 aerich 找不到项目模块的问题。
    它通过在运行 aerich CLI 之前手动将项目根目录添加到 sys.path 来工作。
    
    此脚本通过 runpy 模块来运行 aerich，这与 'python -m aerich' 的效果完全相同，
    同时保证了我们的路径修改能够生效。

    用法:
    python run_aerich.py init-db
    python run_aerich.py migrate
    python run_aerich.py upgrade
    """
    # 模拟 'python -m aerich'
    runpy.run_module('aerich', run_name='__main__')